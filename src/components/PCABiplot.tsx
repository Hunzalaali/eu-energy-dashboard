import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge, Tooltip } from '@mantine/core';
import { type ClusteredData, FEATURES } from '../services/analysis';
import { performPCA } from '../services/pca';
import { useInteraction } from '../context/InteractionContext';

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

const CLUSTER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
const ARROW_COLOR = '#475569';

interface PCABiplotProps {
    data: ClusteredData[];
}

export const PCABiplot = ({ data }: PCABiplotProps) => {
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

    if (projections.length === 0) return <Text>No data for PCA</Text>;

    // SVG dimensions
    const width = 650;
    const height = 480;
    const margin = { top: 40, right: 50, bottom: 50, left: 60 };
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
    // Loadings are in eigenvalue-scaled units; scale to ~30% of plot range
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
                    <Title order={4}>PCA Biplot</Title>
                    <Text size="xs" c="dimmed">Principal Component Analysis with feature loading arrows</Text>
                </div>
                <Badge variant="light" color="indigo" size="sm">
                    {totalVar}% variance explained
                </Badge>
            </Group>

            <svg width={width} height={height} style={{ maxWidth: '100%', height: 'auto' }}>
                {/* Grid lines */}
                <line
                    x1={xScale(0)} y1={margin.top}
                    x2={xScale(0)} y2={margin.top + plotH}
                    stroke="#e5e7eb" strokeDasharray="4,4" strokeWidth={0.5}
                />
                <line
                    x1={margin.left} y1={yScale(0)}
                    x2={margin.left + plotW} y2={yScale(0)}
                    stroke="#e5e7eb" strokeDasharray="4,4" strokeWidth={0.5}
                />

                {/* Axis labels */}
                <text
                    x={margin.left + plotW / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#64748b"
                    fontWeight={500}
                >
                    PC1 ({var1}% variance)
                </text>
                <text
                    x={14}
                    y={margin.top + plotH / 2}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#64748b"
                    fontWeight={500}
                    transform={`rotate(-90, 14, ${margin.top + plotH / 2})`}
                >
                    PC2 ({var2}% variance)
                </text>

                {/* Loading arrows (behind points) */}
                {FEATURES.map((f, fIdx) => {
                    const dx = (loadings[0]?.[fIdx] || 0) * arrowScale;
                    const dy = (loadings[1]?.[fIdx] || 0) * arrowScale;

                    const x2 = xScale(dx);
                    const y2 = yScale(dy);
                    const origin = { x: xScale(0), y: yScale(0) };

                    // Don't render trivial arrows
                    const arrowLen = Math.sqrt(Math.pow(x2 - origin.x, 2) + Math.pow(y2 - origin.y, 2));
                    if (arrowLen < 15) return null;

                    // Label positioning
                    const labelX = x2 + (dx > 0 ? 6 : -6);
                    const labelY = y2 + (dy > 0 ? -6 : 12);
                    const anchor = dx > 0 ? 'start' : 'end';

                    // Short feature name
                    const shortName = f.replace('_share', '').replace('_intensity', ' int.')
                        .replace('per_capita_toe', 'per capita')
                        .replace('energy_dependency', 'import dep.');

                    return (
                        <g key={f}>
                            {/* Arrow line */}
                            <line
                                x1={origin.x} y1={origin.y}
                                x2={x2} y2={y2}
                                stroke={ARROW_COLOR}
                                strokeWidth={1.5}
                                markerEnd="url(#arrowhead)"
                                opacity={0.7}
                            />
                            {/* Label */}
                            <text
                                x={labelX}
                                y={labelY}
                                textAnchor={anchor}
                                fontSize={9}
                                fill={ARROW_COLOR}
                                fontWeight={600}
                                fontStyle="italic"
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
                    const r = isHovered || isSelected ? 8 : 5;
                    const opacity = isFiltered ? 0.15 : 1;
                    const color = CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];

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
                                    stroke={isSelected ? '#dc2626' : isHovered ? '#333' : 'white'}
                                    strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.8}
                                    style={{ transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
                                />
                                {(isHovered || isSelected) && (
                                    <text
                                        x={cx}
                                        y={cy - r - 4}
                                        textAnchor="middle"
                                        fontSize={10}
                                        fontWeight={700}
                                        fill="#1a1b2e"
                                    >
                                        {country}
                                    </text>
                                )}
                            </g>
                        </Tooltip>
                    );
                })}
            </svg>
        </Paper>
    );
};
