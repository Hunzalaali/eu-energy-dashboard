import { useMemo, useState } from 'react';
import { Title, Text, Group, Tooltip, SimpleGrid, Paper } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useInteraction } from '../context/InteractionContext';
import { FEATURES, getMetricLabel, type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

/**
 * Cluster Box Plot — Within-cluster feature distributions (Raw Scales).
 *
 * Visualizes the statistical spread (min, Q1, median, Q3, max) of each
 * energy feature within each cluster using their actual raw units.
 * This provides complementary absolute-value insights to the Radar chart's
 * standardized shapes.
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

export const ClusterBoxPlot = ({ data, clusterNames }: ClusterBoxPlotProps) => {
    const { selectedCountry, hoveredCountry, selectedCluster, hoveredCluster } = useInteraction();

    const clusters = useMemo(
        () => Array.from(new Set(data.map(d => d.cluster))).sort(),
        [data]
    );

    return (
        <div>
            <Group justify="space-between" mb="md">
                <div>
                    <Title order={4}>Feature Distributions by Cluster (Absolute Values)</Title>
                    <Text size="xs" c="dimmed">
                        Visualizing the physical spread (Min, Q1, Median, Q3, Max) within clusters.
                        Uses raw units (%, tCO2e, etc.) for direct policy interpretation.
                    </Text>
                </div>
            </Group>

            {/* Global Legend */}
            <Group mb="lg" gap="xl" justify="center">
                {clusters.map(clusterId => {
                    const color = getClusterColorById(clusterId, clusterNames);
                    const name = clusterNames[clusterId] || `Cluster ${clusterId}`;
                    return (
                        <Group key={clusterId} gap="xs">
                            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, opacity: 0.8 }} />
                            <Text size="xs" c="dimmed">{name}</Text>
                        </Group>
                    );
                })}
                {(selectedCountry || hoveredCountry) && (
                    <Group gap="xs">
                        <svg width={10} height={10} style={{ overflow: 'visible' }}>
                            <polygon points="5,0 10,5 5,10 0,5" fill="#fbbf24" stroke="#1e293b" strokeWidth={1} />
                        </svg>
                        <Text size="xs" c="yellow" fw={600}>{selectedCountry || hoveredCountry}</Text>
                    </Group>
                )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {FEATURES.map(feature => (
                    <FeatureBoxPlot
                        key={feature}
                        feature={feature}
                        data={data}
                        clusters={clusters}
                        clusterNames={clusterNames}
                        selectedCluster={selectedCluster}
                        hoveredCluster={hoveredCluster}
                        selectedCountry={selectedCountry}
                        hoveredCountry={hoveredCountry}
                    />
                ))}
            </SimpleGrid>
        </div>
    );
};

interface FeatureBoxPlotProps {
    feature: string;
    data: ClusteredData[];
    clusters: number[];
    clusterNames: Record<number, string>;
    selectedCluster: number | null;
    hoveredCluster: number | null;
    selectedCountry: string | null;
    hoveredCountry: string | null;
}

const FeatureBoxPlot = ({
    feature, data, clusters, clusterNames,
    selectedCluster, hoveredCluster, selectedCountry, hoveredCountry
}: FeatureBoxPlotProps) => {
    const { ref, width: containerWidth } = useElementSize();
    const [hoveredBox, setHoveredBox] = useState<number | null>(null);

    const statsMap = useMemo(() => {
        const map: Record<number, BoxStats | null> = {};
        clusters.forEach(c => {
            const vals = data.filter(d => d.cluster === c).map(d => Number(d[feature]) || 0);
            map[c] = computeBoxStats(vals);
        });
        return map;
    }, [data, feature, clusters]);

    const yExtent = useMemo(() => {
        const allVals = data.map(d => Number(d[feature]) || 0);
        const min = Math.min(...allVals);
        const max = Math.max(...allVals);
        const pad = (max - min) * 0.1 || 1; // 10% padding
        return { min: min - pad, max: max + pad };
    }, [data, feature]);

    const activeCountryVal = useMemo(() => {
        const code = selectedCountry || hoveredCountry;
        if (!code) return null;
        const row = data.find(d => d.country === code);
        if (!row) return null;
        return { code, val: Number(row[feature]) || 0, cluster: row.cluster };
    }, [data, feature, selectedCountry, hoveredCountry]);

    if (containerWidth === 0) {
        return <Paper ref={ref} withBorder p="sm" style={{ height: 220 }} />;
    }

    // SVG dimensions
    const margin = { top: 16, right: 16, bottom: 24, left: 40 };
    const svgWidth = containerWidth;
    const svgHeight = 220;
    const plotW = svgWidth - margin.left - margin.right;
    const plotH = svgHeight - margin.top - margin.bottom;

    const yMin = yExtent.min;
    const yMax = yExtent.max;
    const yScale = (v: number) => margin.top + plotH * (1 - (v - yMin) / (yMax - yMin));

    const boxSpacing = plotW / clusters.length;
    const boxWidth = Math.max(12, Math.min(32, boxSpacing * 0.5));

    const getX = (index: number) => margin.left + index * boxSpacing + boxSpacing / 2;

    // Tick generation (3 to 5 ticks)
    const ticks = [yMin, yMin + (yMax - yMin) * 0.25, yMin + (yMax - yMin) * 0.5, yMin + (yMax - yMin) * 0.75, yMax];

    return (
        <Paper ref={ref} withBorder p={0} style={{ overflow: 'hidden' }}>
            <Text size="sm" fw={600} ta="center" mt="sm" c="gray.3">
                {getMetricLabel(feature)}
            </Text>
            <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
                {/* Y-axis Ticks & Grid */}
                {ticks.map((t, i) => {
                    const y = yScale(t);
                    return (
                        <g key={i}>
                            <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#64748b">
                                {t.toFixed(t < 10 ? 2 : 0)}
                            </text>
                            <line
                                x1={margin.left} x2={svgWidth - margin.right}
                                y1={y} y2={y}
                                stroke="rgba(255,255,255,0.05)"
                            />
                        </g>
                    );
                })}

                {/* Box Plots */}
                {clusters.map((clusterId, i) => {
                    const stats = statsMap[clusterId];
                    if (!stats) return null;

                    const color = getClusterColorById(clusterId, clusterNames);
                    const x = getX(i);
                    const isDimmed = selectedCluster !== null && selectedCluster !== clusterId;
                    const isHighlighted = hoveredCluster === clusterId || hoveredBox === clusterId;
                    const opacity = isDimmed ? 0.15 : 1;

                    return (
                        <Tooltip
                            key={clusterId}
                            label={
                                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                                    <strong style={{ color }}>{clusterNames[clusterId] || `C${clusterId}`}</strong>
                                    <br />
                                    Max: {stats.max.toFixed(2)}<br />
                                    Q3: {stats.q3.toFixed(2)}<br />
                                    Med: {stats.median.toFixed(2)}<br />
                                    Q1: {stats.q1.toFixed(2)}<br />
                                    Min: {stats.min.toFixed(2)}
                                </div>
                            }
                            position="top"
                            withArrow
                            color="dark"
                        >
                            <g
                                opacity={opacity}
                                onMouseEnter={() => setHoveredBox(clusterId)}
                                onMouseLeave={() => setHoveredBox(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Whiskers */}
                                <line x1={x} x2={x} y1={yScale(stats.max)} y2={yScale(stats.min)} stroke={color} strokeWidth={1.5} />
                                <line x1={x - 4} x2={x + 4} y1={yScale(stats.max)} y2={yScale(stats.max)} stroke={color} strokeWidth={1.5} />
                                <line x1={x - 4} x2={x + 4} y1={yScale(stats.min)} y2={yScale(stats.min)} stroke={color} strokeWidth={1.5} />
                                
                                {/* Box */}
                                <rect
                                    x={x - boxWidth / 2}
                                    y={yScale(stats.q3)}
                                    width={boxWidth}
                                    height={Math.max(1, yScale(stats.q1) - yScale(stats.q3))}
                                    fill={color}
                                    fillOpacity={isHighlighted ? 0.5 : 0.2}
                                    stroke={color}
                                    strokeWidth={isHighlighted ? 2 : 1}
                                    rx={2}
                                />
                                
                                {/* Median */}
                                <line
                                    x1={x - boxWidth / 2} x2={x + boxWidth / 2}
                                    y1={yScale(stats.median)} y2={yScale(stats.median)}
                                    stroke="white" strokeWidth={2}
                                />
                            </g>
                        </Tooltip>
                    );
                })}

                {/* X-axis Cluster Labels */}
                {clusters.map((clusterId, i) => (
                    <text
                        key={`x-${clusterId}`}
                        x={getX(i)}
                        y={svgHeight - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#94a3b8"
                        fontWeight={500}
                    >
                        C{clusterId}
                    </text>
                ))}

                {/* Country Overlay */}
                {activeCountryVal && (
                    <g>
                        {clusters.map((clusterId, i) => {
                            if (clusterId !== activeCountryVal.cluster) return null;
                            const x = getX(i);
                            const y = yScale(activeCountryVal.val);
                            return (
                                <polygon
                                    key="marker"
                                    points={`${x},${y - 6} ${x + 5},${y} ${x},${y + 6} ${x - 5},${y}`}
                                    fill="#fbbf24"
                                    stroke="#1e293b"
                                    strokeWidth={1.5}
                                />
                            );
                        })}
                    </g>
                )}
            </svg>
        </Paper>
    );
};
