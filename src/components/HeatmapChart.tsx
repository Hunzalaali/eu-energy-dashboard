import { useMemo } from 'react';
import { Paper, Title, Text, Box, Tooltip } from '@mantine/core';
import { type ClusteredData, FEATURES, getMetricLabel } from '../services/analysis';
import { useInteraction } from '../context/InteractionContext';

/**
 * Country × Indicator Heatmap with hierarchical cluster ordering.
 * 
 * Visualizes the multivariate energy profile of all EU-27 countries
 * as a color-coded matrix. Countries (rows) are ordered by cluster
 * assignment, revealing block-diagonal structure.
 * 
 * Reference: Wilkinson, L. & Friendly, M. (2009). "The History of the Cluster Heat Map."
 * The American Statistician, 63(2), 179-184.
 */

const DIVERGING_COLORS = [
    '#2166ac', '#4393c3', '#92c5de', '#d1e5f0',
    '#f7f7f7',
    '#fddbc7', '#f4a582', '#d6604d', '#b2182b'
];

function getHeatColor(value: number): string {
    // value is z-score normalized, typically -3 to +3
    const clamped = Math.max(-2.5, Math.min(2.5, value));
    const idx = Math.floor(((clamped + 2.5) / 5) * (DIVERGING_COLORS.length - 1));
    return DIVERGING_COLORS[Math.max(0, Math.min(DIVERGING_COLORS.length - 1, idx))];
}

const CLUSTER_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

interface HeatmapChartProps {
    data: ClusteredData[];
}

export const HeatmapChart = ({ data }: HeatmapChartProps) => {
    const { hoveredCountry, selectedCountry, selectedCluster, setHoveredCountry, toggleCountry } = useInteraction();

    const { rows, zScoreData } = useMemo(() => {
        if (!data || data.length === 0) return { rows: [], zScoreData: new Map(), globalMeans: {}, globalStds: {} };

        // Compute global means and stds for z-score normalization
        const means: Record<string, number> = {};
        const stds: Record<string, number> = {};

        FEATURES.forEach(f => {
            const values = data.map(d => Number(d[f]) || 0);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
            means[f] = mean;
            stds[f] = Math.sqrt(variance) || 1;
        });

        // Compute z-scores for each country
        const zData = new Map<string, Record<string, number>>();
        data.forEach(d => {
            const row: Record<string, number> = {};
            FEATURES.forEach(f => {
                row[f] = ((Number(d[f]) || 0) - means[f]) / stds[f];
            });
            zData.set(d.country, row);
        });

        // Sort by cluster first, then by renewable_share within cluster
        const sorted = [...data].sort((a, b) => {
            if (a.cluster !== b.cluster) return a.cluster - b.cluster;
            return (Number(b.renewable_share) || 0) - (Number(a.renewable_share) || 0);
        });

        return { rows: sorted, zScoreData: zData, globalMeans: means, globalStds: stds };
    }, [data]);

    if (rows.length === 0) return <Text>No data available</Text>;

    const cellW = 90;
    const cellH = 24;
    const labelW = 48;
    const clusterW = 10;
    const headerH = 120;

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Title order={4} mb="xs">Country × Indicator Heatmap</Title>
            <Text size="xs" c="dimmed" mb="md">
                Z-score normalized values. Blue = below average, Red = above average. Rows ordered by cluster assignment.
            </Text>

            <Box style={{ overflowX: 'auto' }}>
                <svg
                    width={labelW + clusterW + cellW * FEATURES.length + 20}
                    height={headerH + cellH * rows.length + 60}
                >
                    {/* Column headers */}
                    {FEATURES.map((f, col) => (
                        <text
                            key={f}
                            x={labelW + clusterW + col * cellW + cellW / 2}
                            y={headerH - 8}
                            textAnchor="end"
                            fontSize={10}
                            fill="#666"
                            transform={`rotate(-45, ${labelW + clusterW + col * cellW + cellW / 2}, ${headerH - 8})`}
                        >
                            {getMetricLabel(f)}
                        </text>
                    ))}

                    {/* Rows */}
                    {rows.map((row, rowIdx) => {
                        const zScores = zScoreData.get(row.country);
                        if (!zScores) return null;

                        const isHovered = hoveredCountry === row.country;
                        const isSelected = selectedCountry === row.country;
                        const isClusterFiltered = selectedCluster !== null && row.cluster !== selectedCluster;
                        const opacity = isClusterFiltered ? 0.15 : 1;

                        return (
                            <g
                                key={row.country}
                                onMouseEnter={() => setHoveredCountry(row.country)}
                                onMouseLeave={() => setHoveredCountry(null)}
                                onClick={() => toggleCountry(row.country)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Hover/selection highlight */}
                                {(isHovered || isSelected) && (
                                    <rect
                                        x={0}
                                        y={headerH + rowIdx * cellH}
                                        width={labelW + clusterW + cellW * FEATURES.length}
                                        height={cellH}
                                        fill={isSelected ? 'rgba(25, 113, 194, 0.08)' : 'rgba(0,0,0,0.04)'}
                                        stroke={isSelected ? '#1971c2' : '#aaa'}
                                        strokeWidth={isSelected ? 1.5 : 0.5}
                                    />
                                )}

                                {/* Country label */}
                                <text
                                    x={labelW - 4}
                                    y={headerH + rowIdx * cellH + cellH / 2 + 4}
                                    textAnchor="end"
                                    fontSize={11}
                                    fill={isHovered || isSelected ? '#1971c2' : '#333'}
                                    fontWeight={isHovered || isSelected ? 700 : 400}
                                    opacity={opacity}
                                >
                                    {row.country}
                                </text>

                                {/* Cluster color strip */}
                                <rect
                                    x={labelW}
                                    y={headerH + rowIdx * cellH + 1}
                                    width={clusterW}
                                    height={cellH - 2}
                                    fill={CLUSTER_COLORS[row.cluster % CLUSTER_COLORS.length]}
                                    opacity={opacity}
                                    rx={1}
                                />

                                {/* Data cells */}
                                {FEATURES.map((f, col) => {
                                    const z = zScores[f];
                                    const rawVal = Number(row[f]) || 0;
                                    return (
                                        <Tooltip
                                            key={f}
                                            label={`${row.country} — ${getMetricLabel(f)}: ${rawVal.toFixed(2)} (z=${z.toFixed(2)})`}
                                            events={{ hover: true, focus: true, touch: true }}
                                        >
                                            <rect
                                                x={labelW + clusterW + col * cellW + 1}
                                                y={headerH + rowIdx * cellH + 1}
                                                width={cellW - 2}
                                                height={cellH - 2}
                                                fill={getHeatColor(z)}
                                                opacity={opacity}
                                                rx={2}
                                                stroke={isHovered ? '#333' : 'none'}
                                                strokeWidth={isHovered ? 0.5 : 0}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Color legend */}
                    <g transform={`translate(${labelW + clusterW}, ${headerH + rows.length * cellH + 15})`}>
                        <text x={0} y={0} fontSize={10} fill="#666">Low (z &lt; 0)</text>
                        {DIVERGING_COLORS.map((color, i) => (
                            <rect
                                key={i}
                                x={70 + i * 20}
                                y={-10}
                                width={20}
                                height={12}
                                fill={color}
                                rx={1}
                            />
                        ))}
                        <text x={70 + DIVERGING_COLORS.length * 20 + 5} y={0} fontSize={10} fill="#666">High (z &gt; 0)</text>
                    </g>
                </svg>
            </Box>
        </Paper>
    );
};
