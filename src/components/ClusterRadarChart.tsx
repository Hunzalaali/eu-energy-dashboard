import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';
import { type ClusteredData, getClusterCentroids, normalizeForRadar, FEATURES, getMetricLabel } from '../services/analysis';

interface ClusterRadarChartProps {
    data: ClusteredData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

const ClusterRadarChart: React.FC<ClusterRadarChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const centroids = getClusterCentroids(data);
        const normalized = normalizeForRadar(data, centroids);

        // Transform for Recharts Radar
        // We want: [{ subject: 'Feature Name', Cluster0: val, Cluster1: val, ... }]
        return FEATURES.map(feature => {
            const entry: Record<string, number | string> = { subject: getMetricLabel(feature) };
            normalized.forEach(c => {
                entry[`Cluster ${c.cluster}`] = c[feature];
            });
            return entry;
        });
    }, [data]);

    const clusters = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Array.from(new Set(data.map(d => d.cluster))).sort();
    }, [data]);

    if (data.length === 0) return <Text>No data available for radar chart</Text>;

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={4} mb="md">Cluster Profiles (Normalized)</Title>
            <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} />

                    {clusters.map((clusterId) => (
                        <Radar
                            key={clusterId}
                            name={`Cluster ${clusterId}`}
                            dataKey={`Cluster ${clusterId}`}
                            stroke={COLORS[clusterId % COLORS.length]}
                            fill={COLORS[clusterId % COLORS.length]}
                            fillOpacity={0.3}
                        />
                    ))}
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </Paper>
    );
};

export default ClusterRadarChart;
