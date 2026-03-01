import { useMemo } from 'react';
import { Paper, Title, Text, SimpleGrid } from '@mantine/core';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ErrorBar, Cell } from 'recharts';
import { type ClusteredData, getBoxPlotStats, FEATURES, getMetricLabel } from '../services/analysis';

interface ClusterBoxPlotProps {
    data: ClusteredData[];
    clusterNames: Record<number, string>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

export const ClusterBoxPlot = ({ data, clusterNames }: ClusterBoxPlotProps) => {

    const clusters = useMemo(() => Array.from(new Set(data.map(d => d.cluster))).sort(), [data]);

    return (
        <Paper shadow="xs" p="md" withBorder mt="md">
            <Title order={4} mb="md">Feature Distribution by Cluster (Box Plot Approximation)</Title>
            <Text size="sm" c="dimmed" mb="lg">
                Visualizing the spread (Min, Q1, Median, Q3, Max) of each feature within clusters.
                Tight ranges indicate high similarity among member countries.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {FEATURES.slice(0, 6).map(feature => (
                    <FeatureBoxPlot
                        key={feature}
                        feature={feature}
                        data={data}
                        clusters={clusters}
                        colors={COLORS}
                        clusterNames={clusterNames}
                    />
                ))}
            </SimpleGrid>
        </Paper>
    );
};

const FeatureBoxPlot = ({ feature, data, clusters, colors, clusterNames }: { feature: string, data: ClusteredData[], clusters: number[], colors: string[], clusterNames: Record<number, string> }) => {

    const chartData = useMemo(() => {
        return clusters.map(c => {
            const stats = getBoxPlotStats(data, feature, c);
            if (!stats) return null;

            return {
                cluster: `C${c}`,
                name: clusterNames[c] || `Cluster ${c}`,
                min: stats.min,
                max: stats.max,
                median: stats.median,
                q1: stats.q1,
                q3: stats.q3,
                range: [stats.min, stats.max]
            };
        }).filter(d => d !== null);
    }, [data, feature, clusters, clusterNames]);

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
                                        <Text size="xs">Median: {d.median.toFixed(2)}</Text>
                                        <Text size="xs">Min: {d.min.toFixed(2)}</Text>
                                    </Paper>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Range Bar (Min to Max) using ErrorBar */}
                    <Bar dataKey="median" barSize={20} fillOpacity={0}>
                        <ErrorBar dataKey="range" width={4} strokeWidth={2} stroke="black" />
                    </Bar>

                    {/* Median Point */}
                    <Bar dataKey="median" barSize={20} fill="#8884d8" shape={(props: any) => {
                        const { x, y, width } = props;
                        return <circle cx={x + width / 2} cy={y} r={4} fill={props.fill} />
                    }}>
                        {
                            (chartData as any).map((_entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))
                        }
                    </Bar>

                </ComposedChart>
            </ResponsiveContainer>
        </Paper>
    );
};
