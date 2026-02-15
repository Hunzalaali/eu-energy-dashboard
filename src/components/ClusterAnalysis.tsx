import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Paper, Title, Text, Group, Stack, Grid, SegmentedControl } from '@mantine/core';
import { type ClusteredData, reclusterData } from '../services/analysis';
import ClusterRadarChart from './ClusterRadarChart';

interface ClusterAnalysisProps {
    data: ClusteredData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

const ClusterAnalysis: React.FC<ClusterAnalysisProps> = ({ data }) => {
    const [method, setMethod] = useState<'tsne' | 'umap'>('tsne');

    const getAxisKeys = () => {
        switch (method) {
            case 'tsne': return { x: 'tsneX', y: 'tsneY', label: 't-SNE' };
            default: return { x: 'umapX', y: 'umapY', label: 'UMAP' };
        }
    };

    const { x, y, label } = getAxisKeys();

    const displayData = React.useMemo(() => {
        if (!data || data.length === 0) return [];

        // For t-SNE and UMAP, users often expect the clusters to match the visual grouping.
        // So we re-cluster based on the projected coordinates.
        const k = new Set(data.map(d => d.cluster)).size || 4;
        return reclusterData(data, [x, y], k);
    }, [data, method, x, y]);

    // Use displayData instead of data for all charts below
    const chartData = displayData;

    return (
        <Stack gap="lg">
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper shadow="xs" p="md" withBorder h="100%">
                        <Group justify="space-between" mb="md">
                            <Title order={3}>Cluster Analysis</Title>
                            <SegmentedControl
                                value={method}
                                onChange={(value) => setMethod(value as any)}
                                data={[
                                    { label: 't-SNE', value: 'tsne' },
                                    { label: 'UMAP', value: 'umap' },
                                ]}
                            />
                        </Group>
                        <ResponsiveContainer width="100%" height={400}>
                            <ScatterChart
                                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                            >
                                <CartesianGrid />
                                <XAxis type="number" dataKey={x} name={x} unit="" tick={{ fontSize: 12 }} label={{ value: `${label} 1`, position: 'bottom', offset: 0 }} />
                                <YAxis type="number" dataKey={y} name={y} unit="" tick={{ fontSize: 12 }} label={{ value: `${label} 2`, angle: -90, position: 'left' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload as ClusteredData;
                                        return (
                                            <Paper p="xs" shadow="sm" withBorder>
                                                <Text size="sm" fw={500}>{d.country}</Text>
                                                <Text size="xs">Cluster: {d.cluster}</Text>
                                                <Text size="xs">{x}: {Number(d[x as keyof ClusteredData])?.toFixed(2)}</Text>
                                                <Text size="xs">{y}: {Number(d[y as keyof ClusteredData])?.toFixed(2)}</Text>
                                            </Paper>
                                        );
                                    }
                                    return null;
                                }} />
                                <Legend />
                                <Scatter name="Countries" data={chartData}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.cluster % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>

                        <Group mt="md" gap="xs" wrap="wrap">
                            {Array.from(new Set(chartData.map(d => d.cluster))).sort().map(cluster => (
                                <Group key={cluster} gap="xs">
                                    <div style={{ width: 12, height: 12, backgroundColor: COLORS[cluster % COLORS.length], borderRadius: '50%' }} />
                                    <Text size="xs" c="dimmed">
                                        Group {cluster}
                                    </Text>
                                </Group>
                            ))}
                        </Group>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                    <ClusterRadarChart data={chartData} />
                </Grid.Col>
            </Grid>

            <Paper shadow="xs" p="md" withBorder>
                <Title order={4} mb="sm">Cluster Membership</Title>
                <Grid>
                    {Array.from(new Set(chartData.map(d => d.cluster))).sort().map(cluster => (
                        <Grid.Col key={cluster} span={{ base: 12, sm: 6, lg: 3 }}>
                            <Group gap="xs" mb={5}>
                                <div style={{ width: 12, height: 12, backgroundColor: COLORS[cluster % COLORS.length], borderRadius: '50%' }} />
                                <Text fw={600}>Cluster {cluster}</Text>
                            </Group>
                            <Text size="sm" style={{ lineHeight: 1.4 }}>
                                {chartData.filter(d => d.cluster === cluster).map(d => d.country).join(', ')}
                            </Text>
                        </Grid.Col>
                    ))}
                </Grid>
            </Paper>
        </Stack>
    );
};

export default ClusterAnalysis;
