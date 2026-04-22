import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';
import { type EnergyData, type ClusteredData, getMetricLabel } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

interface EnergyTrendsChartProps {
    data: EnergyData[];
    selectedCountry: string | null;
    metric: string;
    /** Optional: all-years clustered data for cluster-average sparklines */
    allYearsData?: ClusteredData[];
    clusterNames?: Record<number, string>;
}

export const EnergyTrendsChart = ({
    data, selectedCountry, metric, allYearsData, clusterNames,
}: EnergyTrendsChartProps) => {

    const chartData = useMemo(() => {
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);

        // Cluster IDs present in allYearsData
        const clusterIds = allYearsData
            ? Array.from(new Set(allYearsData.map(d => d.cluster))).sort()
            : [];

        return years.map(year => {
            const yearData = data.filter(d => d.year === year);
            const avg = yearData.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0) / (yearData.length || 1);

            const entry: any = {
                year,
                'EU Average': Number(avg.toFixed(2)),
            };

            // Selected country line
            if (selectedCountry) {
                const countryEntry = yearData.find(d => d.country === selectedCountry);
                if (countryEntry) entry[selectedCountry] = Number(countryEntry[metric]);
            }

            // Per-cluster average lines (from stable clustered data)
            if (allYearsData && clusterIds.length > 0) {
                clusterIds.forEach(cid => {
                    const clusterYearData = allYearsData.filter(d => d.year === year && d.cluster === cid);
                    if (clusterYearData.length === 0) return;
                    const cAvg = clusterYearData.reduce((a, d) => a + (Number(d[metric]) || 0), 0) / clusterYearData.length;
                    const label = clusterNames?.[cid] ?? `Cluster ${cid}`;
                    entry[label] = Number(cAvg.toFixed(2));
                });
            }

            return entry;
        });
    }, [data, selectedCountry, metric, allYearsData, clusterNames]);

    const clusterIds = allYearsData
        ? Array.from(new Set(allYearsData.map(d => d.cluster))).sort()
        : [];

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={4} mb="xs">Temporal Evolution: {getMetricLabel(metric)}</Title>
            <Text size="xs" c="dimmed" mb="md">
                Dashed cluster averages show how each typology group evolved.
                {selectedCountry ? ` Solid line = ${selectedCountry}.` : ' Select a country in the sidebar to highlight it.'}
            </Text>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />

                    {/* EU Average — light grey baseline */}
                    <Line
                        type="monotone" dataKey="EU Average"
                        stroke="#adb5bd" strokeWidth={1.5} strokeDasharray="5 5" dot={false}
                    />

                    {/* Per-cluster averages */}
                    {clusterIds.map(cid => (
                        <Line
                            key={cid}
                            type="monotone"
                            dataKey={clusterNames?.[cid] ?? `Cluster ${cid}`}
                            stroke={getClusterColorById(cid, clusterNames)}
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            opacity={0.75}
                        />
                    ))}

                    {/* Selected country — bold foreground */}
                    {selectedCountry && (
                        <Line
                            type="monotone" dataKey={selectedCountry}
                            stroke="#228be6" strokeWidth={3} activeDot={{ r: 7 }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
