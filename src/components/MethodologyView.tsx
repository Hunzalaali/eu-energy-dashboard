import { useState, useEffect } from 'react';
import { Paper, Title, Grid, Text, LoadingOverlay } from '@mantine/core';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { calculateClusterMetrics, type EnergyData } from '../services/analysis';

interface MethodologyViewProps {
    data: EnergyData[];
    year: number;
}

export const MethodologyView = ({ data, year }: MethodologyViewProps) => {
    const [metrics, setMetrics] = useState<{ k: number; inertia: number; silhouette: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Small timeout to allow UI to render loading state
        setTimeout(() => {
            const results = calculateClusterMetrics(data, year, [2, 3, 4, 5, 6, 7, 8]);
            setMetrics(results);
            setLoading(false);
        }, 100);
    }, [data, year]);

    return (
        <Grid>
            <LoadingOverlay visible={loading} />
            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={400}>
                    <Title order={4} mb="xs">Elbow Method (Inertia)</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Lower inertia indicates better clustering. Look for the "elbow" point where improvement slows down.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="inertia" stroke="#8884d8" strokeWidth={2} />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" label="Selected K=4" />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={400}>
                    <Title order={4} mb="xs">Silhouette Analysis</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Higher score (+1) indicates good separation. Negative score indicates misclassification.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" />
                            <YAxis domain={[-1, 1]} />
                            <Tooltip />
                            <Bar dataKey="silhouette" fill="#82ca9d" />
                            <ReferenceLine y={0} stroke="#000" />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

            <Grid.Col span={12}>
                <Paper shadow="xs" p="md" withBorder>
                    <Title order={4} mb="xs">Interpretation</Title>
                    <Text size="sm">
                        Based on the Elbow Method and Silhouette Scores, a cluster count of <strong>K=4</strong> appears to provide a reasonable balance between model complexity and separation for this dataset.
                        The Elbow plot shows diminishing returns after K=4, and the Silhouette score remains relatively stable.
                    </Text>
                </Paper>
            </Grid.Col>
        </Grid>
    );
};
