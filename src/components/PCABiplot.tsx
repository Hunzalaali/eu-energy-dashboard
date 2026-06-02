import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge, Tooltip, Box } from '@mantine/core';
import { type ClusteredData, FEATURES } from '../services/analysis';
import { performPCA } from '../services/pca';
import { useInteraction } from '../context/InteractionContext';
import { getClusterColorById } from '../utils/clusterColors';

/**
 * PCA Biplot — Projects countries onto PC1 × PC2 with feature loading arrows.
 *
 * This is a standard thesis visualization that shows:
 * 1. How countries separate in the first two principal components
 * 2. Which features drive that separation (loading arrows)
 * 3. How much variance is explained (annotation)
 *
 * Reference: Gabriel, K.R. (1971). "The Biplot Graphic Display of Matrices
 * with Application to Principal Component Analysis." Biometrika, 58(3), 453-467.
 */

const ARROW_COLOR = '#94a3b8';

interface PCABiplotProps {
    data: ClusteredData[];
    energyClusterNames?: Record<number, string>;
}

const getConvexHull = (points: [number, number][]): [number, number][] => {
    if (points.length <= 2) return points;
    
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    
    const cross = (o: [number, number], a: [number, number], b: [number, number]) => {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };
    
    const lower: [number, number][] = [];
    for (let i = 0; i < sorted.length; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
            lower.pop();
        }
        lower.push(sorted[i]);
    }
    
    const upper: [number, number][] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
            upper.pop();
        }
        upper.push(sorted[i]);
    }
    
    lower.pop();
    upper.pop();
    
    return lower.concat(upper);
};

export const PCABiplot = ({ data, energyClusterNames }: PCABiplotProps) => {
    const { hoveredCountry, selectedCountry, selectedCluster, setHoveredCountry, toggleCountry } = useInteraction();

    const { projections, loadings, varianceExplained, countries, clusters } = useMemo(() => {
        if (!data || data.length === 0) {
            return { projections: [], loadings: [], varianceExplained: [], countries: [], clusters: [] };
        }

        // Extract and standardize features
        const dataset = data.map(d =>
            FEATURES.map(f => Number(d[f]) || 0)
        );

        // Z-score standardize
        const means = FEATURES.map((_, i) =>
            dataset.reduce((acc, row) => acc + row[i], 0) / dataset.length
        );
        const stds = FEATURES.map((_, i) => {
            const mean = means[i];
            const variance = dataset.reduce((acc, row) => acc + Math.pow(row[i] - mean, 2), 0) / dataset.length;
            return Math.sqrt(variance) || 1;
        });
        const scaled = dataset.map(row => row.map((v, i) => (v - means[i]) / stds[i]));

        const pcaResult = performPCA(scaled, 2);

        return {
            projections: pcaResult.projections,
            loadings: pcaResult.loadings,
            varianceExplained: pcaResult.varianceExplained,
            countries: data.map(d => d.country),
            clusters: data.map(d => d.cluster),
        };
    }, [data]);

    const hulls = useMemo(() => {
        if (projections.length === 0) return {};
        
        const grouped: Record<number, [number, number][]> = {};
        projections.forEach((p, idx) => {
            const cluster = clusters[idx];
            if (cluster === undefined) return;
            if (!grouped[cluster]) grouped[cluster] = [];
            grouped[cluster].push(p as [number, number]);
        });
        
        const clusterHulls: Record<number, [number, number][]> = {};
        Object.entries(grouped).forEach(([cidStr, pts]) => {
            const cid = Number(cidStr);
            clusterHulls[cid] = getConvexHull(pts);
        });
        
        return clusterHulls;
    }, [projections, clusters]);

    const contributionTable = useMemo(() => {
        if (loadings.length < 2) return null;
        
        return FEATURES.map((f, idx) => {
            const pc1Val = loadings[0]?.[idx] ?? 0;
            const pc2Val = loadings[1]?.[idx] ?? 0;
            return {
                feature: f,
                label: f.replace('_share', ' share').replace('_intensity', ' intensity')
                        .replace('per_capita_toe', 'energy per capita')
                        .replace('energy_dependency', 'import dependency')
                        .replace('ghg', 'GHG'),
                pc1: pc1Val,
                pc2: pc2Val,
                pc1Abs: Math.abs(pc1Val),
                pc2Abs: Math.abs(pc2Val),
            };
        }).sort((a, b) => b.pc1Abs - a.pc1Abs);
    }, [loadings]);

    if (projections.length === 0) return <Text size="sm" c="dimmed">No data for PCA</Text>;

    // SVG dimensions
    const width = 650;
    const height = 400;
    const margin = { top: 30, right: 40, bottom: 45, left: 45 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Compute scales from projections
    const pc1Vals = projections.map(p => p[0]);
    const pc2Vals = projections.map(p => p[1]);
    const pc1Min = Math.min(...pc1Vals) * 1.15;
    const pc1Max = Math.max(...pc1Vals) * 1.15;
    const pc2Min = Math.min(...pc2Vals) * 1.15;
    const pc2Max = Math.max(...pc2Vals) * 1.15;

    const xScale = (v: number) => margin.left + ((v - pc1Min) / (pc1Max - pc1Min)) * plotW;
    const yScale = (v: number) => margin.top + plotH - ((v - pc2Min) / (pc2Max - pc2Min)) * plotH;

    // Scale loading arrows to fit nicely within the plot
    const maxLoading = Math.max(
        ...loadings.flat().map(Math.abs),
        0.1
    );
    const arrowScale = Math.min(
        (pc1Max - pc1Min) * 0.35 / maxLoading,
        (pc2Max - pc2Min) * 0.35 / maxLoading
    );

    const var1 = ((varianceExplained[0] || 0) * 100).toFixed(1);
    const var2 = ((varianceExplained[1] || 0) * 100).toFixed(1);
    const totalVar = (((varianceExplained[0] || 0) + (varianceExplained[1] || 0)) * 100).toFixed(1);

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Group justify="space-between" mb={4}>
                <div>
                    <Title order={4}>PCA Biplot & Convex Hulls</Title>
                    <Text size="xs" c="dimmed">Principal Component Analysis projecting countries and feature loading arrows</Text>
                </div>
                <Badge variant="light" color="indigo" size="sm">
                    {totalVar}% variance explained
                </Badge>
            </Group>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg width={width} height={height} style={{ maxWidth: '100%', height: 'auto' }}>
                    {/* Grid lines */}
                    <line
                        x1={xScale(0)} y1={margin.top}
                        x2={xScale(0)} y2={margin.top + plotH}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" strokeWidth={0.5}
                    />
                    <line
                        x1={margin.left} y1={yScale(0)}
                        x2={margin.left + plotW} y2={yScale(0)}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" strokeWidth={0.5}
                    />

                    {/* Axis labels */}
                    <text
                        x={margin.left + plotW / 2}
                        y={height - 8}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#94a3b8"
                        fontWeight={500}
                    >
                        PC1 ({var1}% variance)
                    </text>
                    <text
                        x={12}
                        y={margin.top + plotH / 2}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#94a3b8"
                        fontWeight={500}
                        transform={`rotate(-90, 12, ${margin.top + plotH / 2})`}
                    >
                        PC2 ({var2}% variance)
                    </text>

                    {/* Convex Hulls */}
                    {Object.entries(hulls).map(([cidStr, pts]) => {
                        const cid = Number(cidStr);
                        if (pts.length < 3) return null;
                        const pointsStr = pts.map(p => `${xScale(p[0])},${yScale(p[1])}`).join(' ');
                        const color = getClusterColorById(cid, energyClusterNames);
                        const isFiltered = selectedCluster !== null && cid !== selectedCluster;
                        
                        return (
                            <polygon
                                key={cid}
                                points={pointsStr}
                                fill={color}
                                fillOpacity={isFiltered ? 0.01 : 0.08}
                                stroke={color}
                                strokeWidth={1.5}
                                strokeDasharray="4,2"
                                strokeOpacity={isFiltered ? 0.08 : 0.35}
                                style={{ transition: 'all 0.3s ease' }}
                            />
                        );
                    })}

                    {/* Loading arrows (behind points) */}
                    {FEATURES.map((f, fIdx) => {
                        const dx = (loadings[0]?.[fIdx] || 0) * arrowScale;
                        const dy = (loadings[1]?.[fIdx] || 0) * arrowScale;

                        const x2 = xScale(dx);
                        const y2 = yScale(dy);
                        const origin = { x: xScale(0), y: yScale(0) };

                        const arrowLen = Math.sqrt(Math.pow(x2 - origin.x, 2) + Math.pow(y2 - origin.y, 2));
                        if (arrowLen < 15) return null;

                        const labelX = x2 + (dx > 0 ? 6 : -6);
                        const labelY = y2 + (dy > 0 ? -6 : 12);
                        const anchor = dx > 0 ? 'start' : 'end';

                        const shortName = f.replace('_share', '').replace('_intensity', ' int.')
                            .replace('per_capita_toe', 'per capita')
                            .replace('energy_dependency', 'import dep.');

                        return (
                            <g key={f}>
                                <line
                                    x1={origin.x} y1={origin.y}
                                    x2={x2} y2={y2}
                                    stroke={ARROW_COLOR}
                                    strokeWidth={1.5}
                                    markerEnd="url(#arrowhead)"
                                    opacity={0.6}
                                />
                                <text
                                    x={labelX}
                                    y={labelY}
                                    textAnchor={anchor}
                                    fontSize={9}
                                    fill={ARROW_COLOR}
                                    fontWeight={600}
                                    fontStyle="italic"
                                    opacity={0.8}
                                >
                                    {shortName}
                                </text>
                            </g>
                        );
                    })}

                    {/* Arrowhead marker */}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth={8}
                            markerHeight={6}
                            refX={8}
                            refY={3}
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill={ARROW_COLOR} />
                        </marker>
                    </defs>

                    {/* Country points */}
                    {projections.map((p, i) => {
                        const country = countries[i];
                        const cluster = clusters[i];
                        const isHovered = hoveredCountry === country;
                        const isSelected = selectedCountry === country;
                        const isFiltered = selectedCluster !== null && cluster !== selectedCluster;

                        const cx = xScale(p[0]);
                        const cy = yScale(p[1]);
                        const r = isHovered || isSelected ? 8 : 4.5;
                        const opacity = isFiltered ? 0.15 : 1;
                        const color = getClusterColorById(cluster, energyClusterNames);

                        return (
                            <Tooltip
                                key={country}
                                label={`${country}: PC1=${p[0].toFixed(2)}, PC2=${p[1].toFixed(2)}`}
                                events={{ hover: true, focus: true, touch: true }}
                            >
                                <g
                                    onMouseEnter={() => setHoveredCountry(country)}
                                    onMouseLeave={() => setHoveredCountry(null)}
                                    onClick={() => toggleCountry(country)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={r}
                                        fill={color}
                                        opacity={opacity}
                                        stroke={isSelected ? '#dc2626' : isHovered ? '#fff' : 'rgba(255,255,255,0.8)'}
                                        strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.8}
                                        style={{ transition: 'r 0.15s ease, stroke-width 0.15s ease, opacity 0.2s' }}
                                    />
                                    {(isHovered || isSelected) && (
                                        <text
                                            x={cx}
                                            y={cy - r - 4}
                                            textAnchor="middle"
                                            fontSize={10}
                                            fontWeight={700}
                                            fill="#fff"
                                            paintOrder="stroke"
                                            stroke="#1a1b2e"
                                            strokeWidth={2}
                                        >
                                            {country}
                                        </text>
                                    )}
                                </g>
                            </Tooltip>
                        );
                    })}
                </svg>
            </div>

            {/* Feature contribution loadings table */}
            <Box mt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <Title order={5} mb="xs">Feature Contributions (PC Loadings)</Title>
                <Text size="xs" c="dimmed" mb="sm">
                    Loadings represent the correlation between each energy feature and the principal components.
                    Values closer to ±1 indicate a strong influence on that axis.
                </Text>
                
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#868e96' }}>Feature</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#868e96', width: '40%' }}>PC1 (Primary Axis) Influence</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#868e96', width: '40%' }}>PC2 (Secondary Axis) Influence</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contributionTable?.map(row => {
                            const pc1Color = row.pc1 >= 0 ? '#2f9e44' : '#e03131';
                            const pc2Color = row.pc2 >= 0 ? '#2f9e44' : '#e03131';
                            const pc1Bar = Math.round(row.pc1Abs * 100);
                            const pc2Bar = Math.round(row.pc2Abs * 100);
                            
                            return (
                                <tr key={row.feature} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <td style={{ padding: '8px', fontWeight: 500, color: '#e9ecef', textTransform: 'capitalize' }}>
                                        {row.label}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                            <span style={{ fontFamily: 'monospace', color: pc1Color, fontWeight: 700 }}>
                                                {row.pc1 >= 0 ? '+' : ''}{row.pc1.toFixed(3)}
                                            </span>
                                            <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${pc1Bar}%`, height: '100%', background: pc1Color }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                            <span style={{ fontFamily: 'monospace', color: pc2Color, fontWeight: 700 }}>
                                                {row.pc2 >= 0 ? '+' : ''}{row.pc2.toFixed(3)}
                                            </span>
                                            <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${pc2Bar}%`, height: '100%', background: pc2Color }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <Text size="xs" c="dimmed" mt="md" style={{ lineHeight: 1.5 }}>
                    <strong>Methodology note:</strong> This PCA Biplot shows that the energy clusters identified by K-Means
                    correspond to natural, distinct separations in the data's two principal dimensions of variation.
                    The loading arrows show which features drive country positions — for example, countries on the right are associated with
                    higher fossil and carbon metrics, whereas countries on the left have higher renewable shares.
                </Text>
            </Box>
        </Paper>
    );
};
