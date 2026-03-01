import { useMemo } from 'react';
import { Paper, Title, Text, Group } from '@mantine/core';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { type ClusteredData } from '../services/analysis';

interface TransitionFlowChartProps {
    data: ClusteredData[];
    selectedCountry: string | null;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

export const TransitionFlowChart = ({ data, selectedCountry }: TransitionFlowChartProps) => {

    // If a country is selected, show its cluster history
    // If no country is selected, maybe show a stacked bar of cluster counts over years? Or a heat map?

    // For "Visualizes the path of a specific country moving between clusters"
    // Let's assume this is primarily for a selected country.

    const chartData = useMemo(() => {
        if (!selectedCountry) {
            // Aggregate view: counts of clusters per year
            const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
            return years.map(year => {
                const yearData = data.filter(d => d.year === year);
                const entry: any = { year };
                const clusters = new Set(data.map(d => d.cluster));
                clusters.forEach(c => {
                    entry[`Cluster ${c}`] = yearData.filter(d => d.cluster === c).length;
                });
                return entry;
            });
        }

        const countryData = data.filter(d => d.country === selectedCountry).sort((a, b) => a.year - b.year);
        return countryData.map(d => ({
            year: d.year,
            cluster: d.cluster,
            // For visualization, we might want to map cluster to a Y value, but that implies order.
            // A simple line or step chart might be misleading if clusters aren't ordinal.
            // But we can just plot the cluster ID for now.
        }));
    }, [data, selectedCountry]);

    const clusters = useMemo(() => Array.from(new Set(data.map(d => d.cluster))).sort(), [data]);

    if (!selectedCountry) {
        return (
            <Paper shadow="xs" p="md" withBorder h="100%">
                <Title order={4} mb="md">Cluster Distribution Over Time</Title>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {clusters.map((c) => (
                            <Bar key={c} dataKey={`Cluster ${c}`} stackId="a" fill={COLORS[c % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        );
    }

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Group justify="space-between" mb="md">
                <Title order={4}>Cluster Transition Path: {selectedCountry}</Title>
            </Group>

            {/* 
                Visualizing "path" between categorical clusters is tricky with standard charts. 
                A step chart could work, or a simple custom visualization.
                Let's use a scatter plot where Y is cluster ID, or a "Swimlane" style.
            */}

            <div style={{ display: 'flex', alignItems: 'center', height: 100, overflowX: 'auto' }}>
                {chartData.map((d, i) => (
                    <div key={d.year} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                            <Text size="xs" c="dimmed">{d.year}</Text>
                            <div
                                style={{
                                    width: 30, height: 30, borderRadius: '50%',
                                    backgroundColor: COLORS[d.cluster % COLORS.length],
                                    margin: '5px auto',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 'bold'
                                }}
                            >
                                {d.cluster}
                            </div>
                        </div>
                        {i < chartData.length - 1 && (
                            <div style={{ height: 2, width: 30, backgroundColor: '#eee', marginTop: 15 }} />
                        )}
                    </div>
                ))}
            </div>
            <Text size="sm" mt="md" c="dimmed">
                Timeline showing which cluster {selectedCountry} belonged to in each year.
            </Text>
        </Paper>
    );
};
