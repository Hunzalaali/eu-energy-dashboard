import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';
import { type EnergyData, getMetricLabel } from '../services/analysis';

interface EnergyTrendsChartProps {
    data: EnergyData[];
    selectedCountry: string | null;
    metric: string;
}

export const EnergyTrendsChart = ({ data, selectedCountry, metric }: EnergyTrendsChartProps) => {

    const chartData = useMemo(() => {
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
        return years.map(year => {
            const yearData = data.filter(d => d.year === year);

            // Calculate EU Average (or dataset average)
            const avg = yearData.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0) / yearData.length;

            const entry: any = {
                year,
                'EU Average': Number(avg.toFixed(2))
            };

            if (selectedCountry) {
                const countryEntry = yearData.find(d => d.country === selectedCountry);
                if (countryEntry) {
                    entry[selectedCountry] = Number(countryEntry[metric]);
                }
            }

            return entry;
        });
    }, [data, selectedCountry, metric]);

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={4} mb="xs">Temporal Evolution: {getMetricLabel(metric)}</Title>
            <Text size="xs" c="dimmed" mb="md">
                Comparing {selectedCountry ? selectedCountry : 'Selection'} vs EU Average over time.
            </Text>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="EU Average"
                        stroke="#adb5bd"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                    {selectedCountry && (
                        <Line
                            type="monotone"
                            dataKey={selectedCountry}
                            stroke="#228be6"
                            strokeWidth={3}
                            activeDot={{ r: 8 }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
