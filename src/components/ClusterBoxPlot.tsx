import { useMemo, useState } from 'react';
import { Title, Text, Group, Tooltip } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useInteraction } from '../context/InteractionContext';
import { FEATURES, getMetricLabel, type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

/**
 * Cluster Box Plot — Within-cluster feature distributions.
 *
 * Visualizes the statistical spread (min, Q1, median, Q3, max) of each
 * energy feature within each cluster. This fills the analytical gap left
 * by the Radar Chart (which shows only cluster means) by revealing
 * within-cluster heterogeneity.
 *
 * Reference: Tukey, J.W. (1977). Exploratory Data Analysis.
 */

interface ClusterBoxPlotProps {
    data: ClusteredData[];
    clusterNames: Record<number, string>;
}

interface BoxStats {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}

const computeBoxStats = (values: number[]): BoxStats | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
        min: sorted[0],
        q1: sorted[Math.floor(sorted.length * 0.25)],
        median: sorted[Math.floor(sorted.length * 0.5)],
        q3: sorted[Math.floor(sorted.length * 0.75)],
        max: sorted[sorted.length - 1],
    };
};

/** Short label for X-axis to prevent overlap */
const SHORT_LABELS: Record<string, string> = {
    'renewable_share': 'Renewable Share',
    'energy_dependency': 'Energy Dependency',
    'ghg_intensity': 'GHG Intensity',
    'energy_intensity': 'Energy Intensity',
    'per_capita_toe': 'Per Capita TOE',
    'fossil_share': 'Fossil Share',
    'nuclear_share': 'Nuclear Share',
};

export const ClusterBoxPlot = ({ data, clusterNames }: ClusterBoxPlotProps) => {
    const { ref, width: containerWidth } = useElementSize();
    const { selectedCountry, hoveredCountry, selectedCluster, hoveredCluster } = useInteraction();
    const [hoveredBox, setHoveredBox] = useState<{ cluster: number; feature: string } | null>(null);

    const clusters = useMemo(
        () => Array.from(new Set(data.map(d => d.cluster))).sort(),
        [data]
    );

    // Compute z-scores globally for comparable cross-feature display
    const { globalMeans, globalStds } = useMemo(() => {
        const means: Record<string, number> = {};
        const stds: Record<string, number> = {};
        FEATURES.forEach(f => {
            const vals = data.map(d => Number(d[f]) || 0);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
            means[f] = mean;
            stds[f] = Math.sqrt(variance) || 1;
        });
        return { globalMeans: means, globalStds: stds };
    }, [data]);

    // Box stats per cluster per feature (z-scored)
    const boxData = useMemo(() => {
        const result: Record<number, Record<string, BoxStats | null>> = {};
        clusters.forEach(c => {
            result[c] = {};
            const clusterPoints = data.filter(d => d.cluster === c);
            FEATURES.forEach(f => {
                const zValues = clusterPoints.map(
                    d => ((Number(d[f]) || 0) - globalMeans[f]) / globalStds[f]
                );
                result[c][f] = computeBoxStats(zValues);
            });
        });
        return result;
    }, [data, clusters, globalMeans, globalStds]);

    // Selected country's z-score values for overlay
    const countryValues = useMemo(() => {
        const code = selectedCountry || hoveredCountry;
        if (!code) return null;
        const row = data.find(d => d.country === code);
        if (!row) return null;
        const vals: Record<string, number> = {};
        FEATURES.forEach(f => {
            vals[f] = ((Number(row[f]) || 0) - globalMeans[f]) / globalStds[f];
        });
        return { code, vals };
    }, [data, selectedCountry, hoveredCountry, globalMeans, globalStds]);

    // ── SVG dimensions ──
    const svgWidth = Math.max(containerWidth - 16, 400);
    const margin = { top: 24, right: 20, bottom: 52, left: 48 };
    const plotW = svgWidth - margin.left - margin.right;
    const plotH = 280;
    const svgHeight = plotH + margin.top + margin.bottom;

    // Y-axis range (z-scores)
    const yMin = -3;
    const yMax = 3;
    const yScale = (v: number) => margin.top + plotH * (1 - (v - yMin) / (yMax - yMin));

    // X layout: 7 feature groups, each with k cluster boxes
    const featureCount = FEATURES.length;
    const groupWidth = plotW / featureCount;
    const boxPad = 4;
    const boxWidth = Math.max(6, Math.min(24, (groupWidth - boxPad * 2) / clusters.length - 2));

    const featureX = (fi: number) => margin.left + fi * groupWidth + groupWidth / 2;
    const boxX = (fi: number, ci: number) => {
        const center = featureX(fi);
        const totalW = clusters.length * (boxWidth + 2) - 2;
        return center - totalW / 2 + ci * (boxWidth + 2);
    };

    // Y-axis ticks
    const yTicks = [-2, -1, 0, 1, 2];

    return (
        <div ref={ref}>
            <Group justify="space-between" mb={4}>
                <div>
                    <Title order={4}>Feature Distributions by Cluster</Title>
                    <Text size="xs" c="dimmed">
                        Box plots show within-cluster spread (Z-scored). Box = Q1–Q3, line = median, whiskers = min–max.
                    </Text>
                </div>
            </Group>

            <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
                {/* Zero line */}
                <line
                    x1={margin.left} x2={svgWidth - margin.right}
                    y1={yScale(0)} y2={yScale(0)}
                    stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3"
                />

                {/* Y-axis ticks & labels */}
                {yTicks.map(t => (
                    <g key={t}>
                        <line
                            x1={margin.left - 4} x2={margin.left}
                            y1={yScale(t)} y2={yScale(t)}
                            stroke="rgba(255,255,255,0.3)"
                        />
                        <text
                            x={margin.left - 8} y={yScale(t) + 3.5}
                            textAnchor="end" fontSize={9} fill="#94a3b8"
                        >
                            {t > 0 ? `+${t}` : t}
                        </text>
                        {/* Grid line */}
                        {t !== 0 && (
                            <line
                                x1={margin.left} x2={svgWidth - margin.right}
                                y1={yScale(t)} y2={yScale(t)}
                                stroke="rgba(255,255,255,0.04)"
                            />
                        )}
                    </g>
                ))}

                {/* Y-axis label */}
                <text
                    x={12} y={margin.top + plotH / 2}
                    textAnchor="middle" fontSize={10} fill="#94a3b8"
                    transform={`rotate(-90, 12, ${margin.top + plotH / 2})`}
                >
                    Z-Score
                </text>

                {/* Feature group separators */}
                {FEATURES.map((_, fi) => (
                    fi > 0 && (
                        <line
                            key={`sep-${fi}`}
                            x1={margin.left + fi * groupWidth}
                            x2={margin.left + fi * groupWidth}
                            y1={margin.top - 4}
                            y2={margin.top + plotH + 4}
                            stroke="rgba(255,255,255,0.06)"
                        />
                    )
                ))}

                {/* Box plots */}
                {FEATURES.map((feature, fi) =>
                    clusters.map((clusterId, ci) => {
                        const stats = boxData[clusterId]?.[feature];
                        if (!stats) return null;

                        const color = getClusterColorById(clusterId, clusterNames);
                        const x = boxX(fi, ci);
                        const isClusterDimmed = selectedCluster !== null && selectedCluster !== clusterId;
                        const isClusterHighlighted =
                            hoveredCluster === clusterId ||
                            (hoveredBox?.cluster === clusterId && hoveredBox?.feature === feature);
                        const opacity = isClusterDimmed ? 0.12 : 1;

                        const clampY = (v: number) => Math.max(yMin, Math.min(yMax, v));

                        return (
                            <Tooltip
                                key={`${clusterId}-${feature}`}
                                label={
                                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                                        <strong style={{ color }}>{clusterNames[clusterId] || `Cluster ${clusterId}`}</strong>
                                        <br />
                                        <strong>{getMetricLabel(feature)}</strong>
                                        <br />
                                        Max: {stats.max.toFixed(2)} · Q3: {stats.q3.toFixed(2)}
                                        <br />
                                        Median: {stats.median.toFixed(2)}
                                        <br />
                                        Q1: {stats.q1.toFixed(2)} · Min: {stats.min.toFixed(2)}
                                    </div>
                                }
                                position="top"
                                withArrow
                                color="dark"
                            >
                                <g
                                    opacity={opacity}
                                    onMouseEnter={() => setHoveredBox({ cluster: clusterId, feature })}
                                    onMouseLeave={() => setHoveredBox(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Whisker line (min to max) */}
                                    <line
                                        x1={x + boxWidth / 2} x2={x + boxWidth / 2}
                                        y1={yScale(clampY(stats.max))}
                                        y2={yScale(clampY(stats.min))}
                                        stroke={color} strokeWidth={1.2}
                                    />
                                    {/* Whisker caps */}
                                    <line
                                        x1={x + 2} x2={x + boxWidth - 2}
                                        y1={yScale(clampY(stats.max))}
                                        y2={yScale(clampY(stats.max))}
                                        stroke={color} strokeWidth={1.2}
                                    />
                                    <line
                                        x1={x + 2} x2={x + boxWidth - 2}
                                        y1={yScale(clampY(stats.min))}
                                        y2={yScale(clampY(stats.min))}
                                        stroke={color} strokeWidth={1.2}
                                    />
                                    {/* Box (Q1 to Q3) */}
                                    <rect
                                        x={x}
                                        y={yScale(clampY(stats.q3))}
                                        width={boxWidth}
                                        height={Math.max(1, yScale(clampY(stats.q1)) - yScale(clampY(stats.q3)))}
                                        fill={color}
                                        fillOpacity={isClusterHighlighted ? 0.45 : 0.25}
                                        stroke={color}
                                        strokeWidth={isClusterHighlighted ? 1.8 : 1}
                                        rx={2}
                                    />
                                    {/* Median line */}
                                    <line
                                        x1={x} x2={x + boxWidth}
                                        y1={yScale(clampY(stats.median))}
                                        y2={yScale(clampY(stats.median))}
                                        stroke="white" strokeWidth={1.8}
                                    />
                                </g>
                            </Tooltip>
                        );
                    })
                )}

                {/* Selected/hovered country value overlay */}
                {countryValues && FEATURES.map((feature, fi) => {
                    const v = countryValues.vals[feature];
                    if (v === undefined || v < yMin || v > yMax) return null;
                    // Find which cluster this country belongs to
                    const row = data.find(d => d.country === countryValues.code);
                    if (!row) return null;
                    const ci = clusters.indexOf(row.cluster);
                    if (ci < 0) return null;

                    const x = boxX(fi, ci) + boxWidth / 2;
                    const y = yScale(v);

                    return (
                        <g key={`country-${feature}`}>
                            {/* Diamond marker */}
                            <polygon
                                points={`${x},${y - 5} ${x + 4},${y} ${x},${y + 5} ${x - 4},${y}`}
                                fill="#fbbf24"
                                stroke="#1e293b"
                                strokeWidth={1.2}
                            />
                        </g>
                    );
                })}

                {/* X-axis: feature labels */}
                {FEATURES.map((feature, fi) => (
                    <text
                        key={feature}
                        x={featureX(fi)}
                        y={margin.top + plotH + 16}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="#94a3b8"
                    >
                        {SHORT_LABELS[feature] || feature}
                    </text>
                ))}

                {/* Legend */}
                {clusters.map((clusterId, ci) => {
                    const color = getClusterColorById(clusterId, clusterNames);
                    const name = clusterNames[clusterId] || `Cluster ${clusterId}`;
                    const legendX = margin.left + ci * (svgWidth - margin.left - margin.right) / clusters.length;
                    return (
                        <g key={`legend-${clusterId}`} transform={`translate(${legendX}, ${svgHeight - 8})`}>
                            <rect width={10} height={10} rx={2} fill={color} fillOpacity={0.7} />
                            <text x={14} y={9} fontSize={10} fill="#94a3b8">
                                {name}
                            </text>
                        </g>
                    );
                })}

                {/* Country indicator in legend */}
                {countryValues && (
                    <g transform={`translate(${svgWidth - margin.right - 100}, ${svgHeight - 8})`}>
                        <polygon
                            points="5,0 9,5 5,10 1,5"
                            fill="#fbbf24" stroke="#1e293b" strokeWidth={0.8}
                        />
                        <text x={14} y={9} fontSize={9} fill="#fbbf24" fontWeight={600}>
                            {countryValues.code}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
};
