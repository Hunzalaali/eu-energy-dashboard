import { useMemo } from 'react';
import { Paper, Title, Text, Box, Tooltip } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { type ClusteredData, FEATURES, getMetricLabel } from '../services/analysis';
import { useInteraction } from '../context/InteractionContext';
import { getClusterColorById } from '../utils/clusterColors';

/**
 * Country × Indicator Heatmap with hierarchical cluster ordering and headers.
 * 
 * Visualizes the multivariate energy profile of all EU-27 countries
 * as a color-coded matrix. Rows are grouped and punctuated by cluster
 * assignment headers, merging heatmap and cluster composition into a single, cohesive view.
 */

const DIVERGING_COLORS = [
    '#2166ac', '#4393c3', '#92c5de', '#d1e5f0',
    '#f7f7f7',
    '#fddbc7', '#f4a582', '#d6604d', '#b2182b'
];

function getHeatColor(value: number): string {
    const clamped = Math.max(-2.5, Math.min(2.5, value));
    const idx = Math.floor(((clamped + 2.5) / 5) * (DIVERGING_COLORS.length - 1));
    return DIVERGING_COLORS[Math.max(0, Math.min(DIVERGING_COLORS.length - 1, idx))];
}

interface HeatmapChartProps {
    data: ClusteredData[];
    clusterNames?: Record<number, string>;
}

export const HeatmapChart = ({ data, clusterNames }: HeatmapChartProps) => {
    const { ref, width } = useElementSize();
    const { hoveredCountry, selectedCountry, selectedCluster, setHoveredCountry, toggleCountry } = useInteraction();

    const { sortedData, zScoreData } = useMemo(() => {
        if (!data || data.length === 0) return { sortedData: [], zScoreData: new Map() };

        const means: Record<string, number> = {};
        const stds: Record<string, number> = {};

        FEATURES.forEach(f => {
            const values = data.map(d => Number(d[f]) || 0);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
            means[f] = mean;
            stds[f] = Math.sqrt(variance) || 1;
        });

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

        return { sortedData: sorted, zScoreData: zData };
    }, [data]);

    // Build the sequential rendering plan: headers + rows
    const { renderingPlan, positions, totalHeight } = useMemo(() => {
        if (sortedData.length === 0) return { renderingPlan: [], positions: [], totalHeight: 0 };

        const plan: ({ type: 'header'; clusterId: number; label: string; count: number } | { type: 'row'; data: ClusteredData; index: number })[] = [];
        const activeClusters = Array.from(new Set(sortedData.map(d => d.cluster))).sort((a, b) => a - b);
        
        activeClusters.forEach(cid => {
            const clusterCountries = sortedData.filter(d => d.cluster === cid);
            plan.push({
                type: 'header',
                clusterId: cid,
                label: clusterNames?.[cid] || `Cluster ${cid}`,
                count: clusterCountries.length,
            });
            clusterCountries.forEach((countryData, idx) => {
                plan.push({
                    type: 'row',
                    data: countryData,
                    index: idx,
                });
            });
        });

        const headerH = 50;
        const cellH = 24;
        const headerRowH = 38;
        
        let currentY = headerH;
        const pos = plan.map(item => {
            const y = currentY;
            if (item.type === 'header') {
                currentY += headerRowH;
            } else {
                currentY += cellH;
            }
            return y;
        });

        return {
            renderingPlan: plan,
            positions: pos,
            totalHeight: currentY + 55,
        };
    }, [sortedData, clusterNames]);

    if (sortedData.length === 0) return <Text size="sm" c="dimmed">No data available for heatmap.</Text>;

    const labelW = 45;
    const clusterW = 12;
    const headerH = 50;
    const rightMargin = 20;

    // Dynamically calculate cell width to fit the container perfectly.
    // Minimum cell width is 60px so it doesn't get unreadable on small mobile screens.
    const dynamicCellW = width > 0 
        ? Math.max(60, (width - labelW - clusterW - rightMargin) / FEATURES.length)
        : 110; // Default fallback before ResizeObserver fires

    const cellW = dynamicCellW;
    const cellH = 24;

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Title order={4} mb="xs">Country × Indicator Heatmap</Title>
            <Text size="xs" c="dimmed" mb="md">
                Grouped by energy profile clusters. Z-score normalized values relative to the active year's EU average. 
                <span style={{ color: '#d6604d', fontWeight: 600 }}> Red = Above Average</span>, 
                <span style={{ color: '#4393c3', fontWeight: 600 }}> Blue = Below Average</span>.
            </Text>

            <Box ref={ref} style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <svg
                    width={Math.max(width, labelW + clusterW + cellW * FEATURES.length + rightMargin)}
                    height={totalHeight}
                >
                    {/* Column headers */}
                    {FEATURES.map((f, col) => {
                        const cx = labelW + clusterW + col * cellW + cellW / 2;
                        const cy = headerH - 22;
                        const fullLabel = getMetricLabel(f).split(' (')[0];
                        const words = fullLabel.split(' ');
                        const mid = Math.ceil(words.length / 2);
                        const line1 = words.length > 1 ? words.slice(0, mid).join(' ') : fullLabel;
                        const line2 = words.length > 1 ? words.slice(mid).join(' ') : '';

                        return (
                            <text
                                key={f}
                                textAnchor="middle"
                                fontSize={10.5}
                                fill="#94a3b8"
                                fontWeight={600}
                            >
                                <tspan x={cx} y={cy}>{line1}</tspan>
                                {line2 && <tspan x={cx} y={cy + 13}>{line2}</tspan>}
                            </text>
                        );
                    })}

                    {/* Sequential elements (headers + rows) */}
                    {renderingPlan.map((item, planIdx) => {
                        const y = positions[planIdx];

                        if (item.type === 'header') {
                            const color = getClusterColorById(item.clusterId, clusterNames);
                            const isFiltered = selectedCluster !== null && item.clusterId !== selectedCluster;
                            const opacity = isFiltered ? 0.25 : 1;

                            return (
                                <g key={`header-${item.clusterId}`} style={{ opacity, transition: 'opacity 0.25s' }}>
                                    {/* Horizontal Divider Line */}
                                    <line
                                        x1={0} y1={y + 19}
                                        x2={labelW + clusterW + cellW * FEATURES.length} y2={y + 19}
                                        stroke="rgba(255,255,255,0.06)"
                                        strokeWidth={1}
                                    />
                                    {/* Background Pill */}
                                    <rect
                                        x={0} y={y + 4}
                                        width={labelW + clusterW + cellW * FEATURES.length} height={28}
                                        fill={`${color}12`}
                                        rx={4}
                                    />
                                    {/* Color Indicator Bullet */}
                                    <circle
                                        cx={12} cy={y + 18} r={5}
                                        fill={color}
                                    />
                                    {/* Group Name */}
                                    <text
                                        x={24} y={y + 21}
                                        fontSize={11.5}
                                        fontWeight={700}
                                        fill={color}
                                    >
                                        {item.label}
                                    </text>
                                    {/* Country Count Badge */}
                                    <text
                                        x={labelW + clusterW + cellW * FEATURES.length - 8} y={y + 21}
                                        textAnchor="end"
                                        fontSize={9.5}
                                        fontWeight={600}
                                        fill="#64748b"
                                    >
                                        {item.count} countries
                                    </text>
                                </g>
                            );
                        }

                        // Otherwise, it's a row
                        const row = item.data;
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
                                {/* Hover/selection highlight rect */}
                                {(isHovered || isSelected) && (
                                    <rect
                                        x={0}
                                        y={y}
                                        width={labelW + clusterW + cellW * FEATURES.length}
                                        height={cellH}
                                        fill={isSelected ? 'rgba(76, 110, 245, 0.08)' : 'rgba(255,255,255,0.02)'}
                                        stroke={isSelected ? '#4c6ef5' : 'rgba(255,255,255,0.12)'}
                                        strokeWidth={isSelected ? 1.5 : 0.5}
                                    />
                                )}

                                {/* Country label */}
                                <text
                                    x={labelW - 8}
                                    y={y + cellH / 2 + 4}
                                    textAnchor="end"
                                    fontSize={10.5}
                                    fill={isHovered || isSelected ? '#4c6ef5' : '#e2e8f0'}
                                    fontWeight={isHovered || isSelected ? 700 : 500}
                                    opacity={opacity}
                                >
                                    {row.country}
                                </text>

                                {/* Cluster color strip */}
                                <rect
                                    x={labelW}
                                    y={y + 1}
                                    width={clusterW - 2}
                                    height={cellH - 2}
                                    fill={getClusterColorById(row.cluster, clusterNames)}
                                    opacity={opacity}
                                    rx={1.5}
                                />

                                {/* Data cells */}
                                {FEATURES.map((f, col) => {
                                    const z = zScores[f];
                                    const rawVal = Number(row[f]) || 0;
                                    return (
                                        <Tooltip
                                            key={f}
                                            label={`${row.country} — ${getMetricLabel(f)}: ${rawVal.toFixed(1)}${f.includes('share') || f.includes('dependency') ? '%' : ''} (z=${z.toFixed(2)})`}
                                            events={{ hover: true, focus: true, touch: true }}
                                        >
                                            <rect
                                                x={labelW + clusterW + col * cellW + 1}
                                                y={y + 1}
                                                width={cellW - 2}
                                                height={cellH - 2}
                                                fill={getHeatColor(z)}
                                                opacity={opacity}
                                                rx={2}
                                                stroke={isHovered ? '#fff' : 'none'}
                                                strokeWidth={isHovered ? 0.5 : 0}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Color legend */}
                    <g transform={`translate(${labelW + clusterW + 40}, ${totalHeight - 30})`}>
                        <text x={-45} y={0} fontSize={9.5} fill="#64748b" fontWeight={600}>Below Avg (z &lt; 0)</text>
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
                        <text x={70 + DIVERGING_COLORS.length * 20 + 8} y={0} fontSize={9.5} fill="#64748b" fontWeight={600}>Above Avg (z &gt; 0)</text>
                    </g>
                </svg>
            </Box>
        </Paper>
    );
};
