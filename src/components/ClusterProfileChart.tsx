
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';
import { type ClusteredData, getMetricLabel } from '../services/analysis';

interface ClusterProfileChartProps {
    data: ClusteredData[];
    clusterId: number;
    metric: string;
}

export const ClusterProfileChart = ({ data, clusterId, metric }: ClusterProfileChartProps) => {
    const chartData = useMemo(() => {
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);

        return years.map(year => {
            const yearData = data.filter(d => d.year === year);
            const clusterData = yearData.filter(d => d.clusterTimeSeries === clusterId);
            const otherData = yearData.filter(d => d.clusterTimeSeries !== clusterId);

            const avgCluster = clusterData.length > 0
                ? clusterData.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0) / clusterData.length
                : 0;

            const avgOthers = otherData.length > 0
                ? otherData.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0) / otherData.length
                : 0;

            return {
                year,
                cluster: Number(avgCluster.toFixed(2)),
                others: Number(avgOthers.toFixed(2)),
            };
        });
    }, [data, clusterId, metric]);

    return (
        <Paper withBorder p="md" radius="md" h={300} mt="md">
            <Title order={5} mb="xs">
                {getMetricLabel(metric)} Evolution
            </Title>
            <Text size="xs" c="dimmed" mb="md">
                Comparing Cluster {clusterId} (Green) vs Rest of Europe (Grey)
            </Text>
            <ResponsiveContainer width="100%" height="80%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 0,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="cluster"
                        name={`Cluster ${clusterId}`}
                        stroke="#2f9e44"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="others"
                        name="Rest of EU"
                        stroke="#adb5bd"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                    />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
