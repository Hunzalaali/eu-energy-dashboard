import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Title, Text, Group } from '@mantine/core';
import { type ClusteredData } from '../services/analysis';

interface ClusterScatterPlotProps {
    data: ClusteredData[];
    method?: 'umap' | 'tsne';
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

export const ClusterScatterPlot = ({ data, method = 'umap' }: ClusterScatterPlotProps) => {

    const chartData = useMemo(() => {
        return data.map(d => ({
            ...d,
            x: method === 'umap' ? d.umapX : d.tsneX,
            y: method === 'umap' ? d.umapY : d.tsneY,
        }));
    }, [data, method]);

    return (
        <Paper shadow="xs" p="md" withBorder h="100%" style={{ minHeight: 400 }}>
            <Group justify="space-between" mb="md">
                <Title order={4}>Cluster Separation ({method.toUpperCase()})</Title>
                <Text size="xs" c="dimmed">
                    2D projection of {data.length} countries based on energy profile.
                </Text>
            </Group>

            <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="X" hide />
                    <YAxis type="number" dataKey="y" name="Y" hide />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <Paper p="xs" shadow="xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                                        <Text fw={700} size="sm">{data.country}</Text>
                                        <Text size="xs">Cluster: {data.cluster}</Text>
                                    </Paper>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend />
                    {Array.from(new Set(data.map(d => d.cluster))).sort().map((clusterId) => (
                        <Scatter
                            key={clusterId}
                            name={`Cluster ${clusterId}`}
                            data={chartData.filter(d => d.cluster === clusterId)}
                            fill={COLORS[clusterId % COLORS.length]}
                        >
                            {/* We can map cells if we want individual control, but Scatter group is better for legend */}
                        </Scatter>
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </Paper>
    );
};
