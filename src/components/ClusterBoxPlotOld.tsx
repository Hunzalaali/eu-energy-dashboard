import { useMemo } from 'react';
import { Paper, Title, Text, SimpleGrid, Group } from '@mantine/core';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ErrorBar, Cell, ReferenceDot } from 'recharts';
import { type ClusteredData, getBoxPlotStats, FEATURES, getMetricLabel } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';
import { formatCountryName } from './MapChart';

interface ClusterBoxPlotOldProps {
    data: ClusteredData[];
    clusterNames: Record<number, string>;
}

export const ClusterBoxPlotOld = ({ data, clusterNames }: ClusterBoxPlotOldProps) => {
    const { selectedCluster, hoveredCluster, selectedCountry, hoveredCountry } = useInteraction();
    const clusters = useMemo(() => Array.from(new Set(data.map(d => d.cluster))).sort(), [data]);

    return (
        <Paper shadow="xs" p="md" withBorder mt="md">
            <Title order={4} mb="md">Feature Distribution by Cluster (Box Plot Approximation)</Title>
            <Text size="sm" c="dimmed" mb="lg">
                Visualizing the spread (Min, Q1, Median, Q3, Max) of each feature within clusters.
                Tight ranges indicate high similarity among member countries.
            </Text>

            {/* Global Legend */}
            <Group mb="lg" gap="xl" justify="center">
                {clusters.map(clusterId => {
                    const color = getClusterColorById(clusterId, clusterNames);
                    const name = `C${clusterId}: ${clusterNames[clusterId]}` || `C${clusterId}`;
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
                            <circle cx="5" cy="5" r="4" fill="#fbbf24" stroke="#1e293b" strokeWidth={1} />
                        </svg>
                        <Text size="xs" c="yellow" fw={600}>{formatCountryName(selectedCountry) || formatCountryName(hoveredCountry)}</Text>
                    </Group>
                )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
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
        </Paper>
    );
};

const FeatureBoxPlot = ({
    feature, data, clusters, clusterNames,
    selectedCluster, hoveredCluster, selectedCountry, hoveredCountry
}: any) => {

    const chartData = useMemo(() => {
        return clusters.map((c: number) => {
            const stats = getBoxPlotStats(data, feature, c);
            if (!stats) return null;

            return {
                clusterId: c,
                cluster: `C${c}`,
                name: clusterNames[c] || `Cluster ${c}`,
                min: stats.min,
                max: stats.max,
                median: stats.median,
                q1: stats.q1,
                q3: stats.q3,
                range: [stats.median - stats.min, stats.max - stats.median],
                iqr: [stats.median - stats.q1, stats.q3 - stats.median]
            };
        }).filter((d: any) => d !== null);
    }, [data, feature, clusters, clusterNames]);

    const activeCountryVal = useMemo(() => {
        const code = selectedCountry || hoveredCountry;
        if (!code) return null;
        const row = data.find((d: any) => d.country === code);
        if (!row) return null;
        return { code, val: Number(row[feature]) || 0, cluster: `C${row.cluster}` };
    }, [data, feature, selectedCountry, hoveredCountry]);

    return (
        <Paper withBorder p="xs">
            <Text size="xs" fw={700} mb="xs" ta="center">{getMetricLabel(feature)}</Text>
            <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData as any} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="cluster" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <Paper p="xs" shadow="sm" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                                        <Text size="xs" fw={700}>{d.name} ({d.cluster})</Text>
                                        <Text size="xs">Max: {d.max.toFixed(2)}</Text>
                                        <Text size="xs">Q3: {d.q3.toFixed(2)}</Text>
                                        <Text size="xs">Median: {d.median.toFixed(2)}</Text>
                                        <Text size="xs">Q1: {d.q1.toFixed(2)}</Text>
                                        <Text size="xs">Min: {d.min.toFixed(2)}</Text>
                                    </Paper>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Single Bar component with custom shape and ErrorBars to prevent X-axis offsetting */}
                    <Bar dataKey="median" barSize={20} fill="#8884d8" shape={(props: any) => {
                        const { x, y, width, payload } = props;
                        const isDimmed = selectedCluster !== null && selectedCluster !== payload.clusterId;
                        return <circle cx={x + width / 2} cy={y} r={4} fill={props.fill} opacity={isDimmed ? 0.2 : 1} />
                    }}>
                        <ErrorBar dataKey="range" width={4} strokeWidth={2} stroke="black" />
                        <ErrorBar dataKey="iqr" width={0} strokeWidth={8} stroke="#94a3b8" opacity={0.4} />
                        {
                            (chartData as any).map((entry: any, index: number) => {
                                const isDimmed = selectedCluster !== null && selectedCluster !== entry.clusterId;
                                return <Cell key={`cell-${index}`} fill={getClusterColorById(entry.clusterId, clusterNames)} fillOpacity={isDimmed ? 0.2 : 1} />
                            })
                        }
                    </Bar>

                    {activeCountryVal && (
                        <ReferenceDot x={activeCountryVal.cluster} y={activeCountryVal.val} r={3.5} fill="#fbbf24" stroke="#1e293b" strokeWidth={0.5} />
                    )}

                </ComposedChart>
            </ResponsiveContainer>
        </Paper>
    );
};
