import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text, Box } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';

interface EnergyMixChartProps {
    data: EnergyData[];
    selectedCountry: string | null;
}

const COLORS = {
    renewable: '#8ce99a', // Light green
    nuclear: '#74c0fc', // Light blue
    fossil: '#adb5bd',  // Grey
};

export const EnergyMixChart = ({ data, selectedCountry }: EnergyMixChartProps) => {

    const chartData = useMemo(() => {
        // Build timeline
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);

        return years.map(year => {
            const yearData = data.filter(d => d.year === year);
            const target = selectedCountry
                ? yearData.find(d => d.country === selectedCountry)
                : {
                    renewable_share: yearData.reduce((acc, curr) => acc + (curr.renewable_share || 0), 0) / yearData.length,
                    nuclear_share: yearData.reduce((acc, curr) => acc + (curr.nuclear_share || 0), 0) / yearData.length,
                    fossil_share: yearData.reduce((acc, curr) => acc + (curr.fossil_share || 0), 0) / yearData.length,
                };

            return {
                year,
                renewable: target?.renewable_share || 0,
                nuclear: target?.nuclear_share || 0,
                fossil: target?.fossil_share || 0,
            };
        });
    }, [data, selectedCountry]);

    return (
        <Paper shadow="sm" p="md" withBorder h="100%">
            <Box mb="sm">
                <Title order={5}>Energy Mix Transition</Title>
                <Text size="xs" c="dimmed">
                    Share of Fossil vs Renewable vs Nuclear (%)
                </Text>
            </Box>

            <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" minTickGap={20} />
                    <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                    <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                    <Legend />
                    <Area
                        type="monotone"
                        dataKey="renewable"
                        name="Renewables"
                        stackId="1"
                        stroke={COLORS.renewable}
                        fill={COLORS.renewable}
                    />
                    <Area
                        type="monotone"
                        dataKey="nuclear"
                        name="Nuclear"
                        stackId="1"
                        stroke={COLORS.nuclear}
                        fill={COLORS.nuclear}
                    />
                    <Area
                        type="monotone"
                        dataKey="fossil"
                        name="Fossil Fuels"
                        stackId="1"
                        stroke={COLORS.fossil}
                        fill={COLORS.fossil}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Paper>
    );
};
