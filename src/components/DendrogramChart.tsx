import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import { FEATURES, type ClusteredData } from '../services/analysis';
import { hierarchicalClustering, type DendrogramNode } from '../services/hierarchicalClustering';
import { useInteraction } from '../context/InteractionContext';
import { getClusterColorById } from '../utils/clusterColors';


interface DendrogramChartProps {
    data: ClusteredData[];
    k?: number;
    clusterNames?: Record<number, string>;
}

interface LayoutNode {
    x: number;          // Horizontal center
    y: number;          // Vertical position (based on height)
    label?: string;
    cluster: number;
    isLeaf: boolean;
    left?: LayoutNode;
    right?: LayoutNode;
    height: number;
    members: number[];
}

export const DendrogramChart = ({ data, k = 4, clusterNames }: DendrogramChartProps) => {
    const { hoveredCountry, selectedCountry, setHoveredCountry, toggleCountry } = useInteraction();

    const { layoutRoot, maxHeight, leafCount, cutHeight } = useMemo(() => {
        if (!data || data.length === 0) return { layoutRoot: null, maxHeight: 1, leafCount: 0, cutHeight: 0 };

        const labels = data.map(d => d.country);
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

        const result = hierarchicalClustering(scaled, labels, k);

        // Determine cut height: the height of the (k)th merge from the top
        // This is the merge distance where k clusters are formed
        const mergeHeights = result.mergeHistory.map(m => m[2]).sort((a, b) => b - a);
        const cutH = mergeHeights.length >= k ? (mergeHeights[k - 2] + mergeHeights[k - 1]) / 2 : mergeHeights[0] || 1;

        const kmeansClusters = data.map(d => d.cluster);

        // Layout the dendrogram tree: assign x positions to leaves, y positions by height
        let leafIdx = 0;

        function layout(node: DendrogramNode): LayoutNode {
            if (!node.left && !node.right) {
                // Leaf node
                const idx = node.members[0];
                return {
                    x: leafIdx++,
                    y: node.height,
                    label: node.label,
                    cluster: kmeansClusters[idx] ?? 0,
                    isLeaf: true,
                    height: node.height,
                    members: node.members,
                };
            }

            const left = node.left ? layout(node.left) : undefined;
            const right = node.right ? layout(node.right) : undefined;

            const x = ((left?.x ?? 0) + (right?.x ?? 0)) / 2;

            // Determine cluster: if all members are same K-Means cluster, use that
            const memberClusters = new Set(node.members.map(m => kmeansClusters[m]));
            const cluster = memberClusters.size === 1 ? kmeansClusters[node.members[0]] : -1;

            return {
                x,
                y: node.height,
                cluster,
                isLeaf: false,
                left,
                right,
                height: node.height,
                members: node.members,
            };
        }

        const layoutRoot = layout(result.dendrogram);

        return {
            layoutRoot,
            maxHeight: result.dendrogram.height,
            leafCount: data.length,
            cutHeight: cutH,
        };
    }, [data, k]);

    if (!layoutRoot) return <Text>No data for dendrogram</Text>;

    // SVG dimensions
    const width = 750;
    const height = 500;
    const margin = { top: 30, right: 30, bottom: 80, left: 60 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const xScale = (leafX: number) => margin.left + (leafX / (leafCount - 1)) * plotW;
    const yScale = (h: number) => margin.top + plotH - (h / (maxHeight * 1.05)) * plotH;

    // Recursively render links and nodes
    const elements: React.ReactElement[] = [];

    function renderNode(node: LayoutNode, idx: number) {
        const cx = xScale(node.x);
        const cy = yScale(node.y);

        if (node.left && node.right) {
            const leftX = xScale(node.left.x);
            const leftY = yScale(node.left.y);
            const rightX = xScale(node.right.x);
            const rightY = yScale(node.right.y);

            // Determine colors for branches
            const leftColor = node.left.cluster >= 0
                ? getClusterColorById(node.left.cluster, clusterNames)
                : '#94a3b8';
            const rightColor = node.right.cluster >= 0
                ? getClusterColorById(node.right.cluster, clusterNames)
                : '#94a3b8';

            // Draw U-shaped connector: vertical from left child to merge height,
            // horizontal at merge height, vertical from merge height to right child
            elements.push(
                <g key={`link-${idx}`}>
                    {/* Left vertical */}
                    <line x1={leftX} y1={leftY} x2={leftX} y2={cy}
                        stroke={leftColor} strokeWidth={2.5} />
                    {/* Right vertical */}
                    <line x1={rightX} y1={rightY} x2={rightX} y2={cy}
                        stroke={rightColor} strokeWidth={2.5} />
                    {/* Horizontal bridge */}
                    <line x1={leftX} y1={cy} x2={rightX} y2={cy}
                        stroke="#94a3b8" strokeWidth={2.5} />
                </g>
            );

            renderNode(node.left, idx * 2 + 1);
            renderNode(node.right, idx * 2 + 2);
        }

        // Leaf labels
        if (node.isLeaf && node.label) {
            const country = node.label;
            const isHi = hoveredCountry === country || selectedCountry === country;
            const color = getClusterColorById(node.cluster, clusterNames);

            elements.push(
                <g key={`leaf-${country}`}
                    onMouseEnter={() => setHoveredCountry(country)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => toggleCountry(country)}
                    style={{ cursor: 'pointer' }}
                >
                    <circle
                        cx={cx}
                        cy={yScale(0) + 3}
                        r={isHi ? 6 : 4}
                        fill={color}
                        stroke={isHi ? '#1a1b2e' : 'white'}
                        strokeWidth={isHi ? 2 : 1}
                    />
                    <text
                        x={cx}
                        y={yScale(0) + 18}
                        textAnchor="middle"
                        fontSize={isHi ? 11.5 : 10.5}
                        fontWeight={isHi ? 800 : 700}
                        fill={isHi ? '#1a1b2e' : '#495057'}
                    >
                        {country}
                    </text>
                </g>
            );
        }
    }

    renderNode(layoutRoot, 0);

    // Y-axis ticks
    const yTicks = [];
    const tickStep = maxHeight / 5;
    for (let t = 0; t <= maxHeight; t += tickStep) {
        yTicks.push(t);
    }

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Group justify="space-between" mb={4}>
                <div>
                    <Title order={4}>Ward's Dendrogram</Title>
                    <Text size="xs" c="dimmed">
                        Agglomerative hierarchical clustering — merge distance on Y-axis
                    </Text>
                </div>
                <Badge variant="light" color="orange" size="sm">
                    Cut at K={k}
                </Badge>
            </Group>

            <svg width={width} height={height} style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }}>
                {/* Y-axis label */}
                <text
                    x={14}
                    y={margin.top + plotH / 2}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={500}
                    transform={`rotate(-90, 14, ${margin.top + plotH / 2})`}
                >
                    Ward Distance
                </text>

                {/* Y-axis ticks */}
                {yTicks.map(t => (
                    <g key={`ytick-${t}`}>
                        <line
                            x1={margin.left - 5} y1={yScale(t)}
                            x2={margin.left + plotW} y2={yScale(t)}
                            stroke="#f1f3f5" strokeWidth={0.5}
                        />
                        <text
                            x={margin.left - 8}
                            y={yScale(t) + 4}
                            textAnchor="end"
                            fontSize={9}
                            fill="#94a3b8"
                        >
                            {t.toFixed(1)}
                        </text>
                    </g>
                ))}

                {/* Cut line */}
                <line
                    x1={margin.left} y1={yScale(cutHeight)}
                    x2={margin.left + plotW} y2={yScale(cutHeight)}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="8,4"
                />
                <text
                    x={margin.left + plotW + 4}
                    y={yScale(cutHeight) + 4}
                    fontSize={10}
                    fill="#ef4444"
                    fontWeight={600}
                >
                    K={k}
                </text>

                {/* Tree structure */}
                {elements}
            </svg>
        </Paper>
    );
};
