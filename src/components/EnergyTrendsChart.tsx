import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title } from '@mantine/core';
import { type EnergyData } from '../services/analysis';

interface EnergyTrendsChartProps {
    data: EnergyData[];
    title: string;
}

export const EnergyTrendsChart = ({ data, title }: EnergyTrendsChartProps) => {
    // Aggregate data by year if multiple countries
    // Note: If we are viewing a single country, this works directly.
    // If viewing 'All', we should probably average the values for the year.

    const years = Array.from(new Set(data.map(d => d.year))).sort();

    const chartData = years.map(year => {
        const yearData = data.filter(d => d.year === year);
        const avgRenewable = yearData.reduce((acc, curr) => acc + curr.renewable_share, 0) / yearData.length;
        const avgFossil = yearData.reduce((acc, curr) => acc + curr.fossil_share, 0) / yearData.length;

        return {
            year,
            renewable: Number(avgRenewable.toFixed(2)),
            fossil: Number(avgFossil.toFixed(2)),
        };
    });

    return (
        <Paper withBorder p="md" radius="md" h={400}>
            <Title order={3} mb="md">{title}</Title>
            <ResponsiveContainer width="100%" height="90%">
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
                    <Line type="monotone" dataKey="renewable" name="Renewable Share %" stroke="#12b886" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="fossil" name="Fossil Share %" stroke="#fd7e14" />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
