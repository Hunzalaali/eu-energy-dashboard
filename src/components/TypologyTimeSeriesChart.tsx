import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { EnergyData } from '../data/useEnergyData';

interface TypologyTimeSeriesChartProps {
    data: EnergyData[];
    metricKey: keyof EnergyData;
    year: number;
}

export const TypologyTimeSeriesChart: React.FC<TypologyTimeSeriesChartProps> = ({
    data,
    metricKey,
    year,
}) => {
    const chartData = useMemo(() => {
        if (data.length === 0) return [];

        // Filter to valid cluster data
        const clusteredData = data.filter(d => d.cluster !== undefined && d.cluster !== -1);

        // Group by Year, then calculate average metric per Cluster
        const years = Array.from(new Set(clusteredData.map(d => d.year))).sort();
        const clusters = Array.from(new Set(clusteredData.map(d => d.clusterName as string))).filter(Boolean);

        return years.map(year => {
            const yearData = clusteredData.filter(d => d.year === year);
            const dataPoint: any = { year };

            clusters.forEach(clusterName => {
                const clusterCountries = yearData.filter(d => d.clusterName === clusterName);
                if (clusterCountries.length > 0) {
                    const sum = clusterCountries.reduce((acc, curr) => acc + (curr[metricKey] as number || 0), 0);
                    dataPoint[clusterName] = sum / clusterCountries.length; // Average
                } else {
                    dataPoint[clusterName] = null;
                }
            });

            return dataPoint;
        });

    }, [data, metricKey]);

    // Colors for the 4 clusters
    const clusterColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    const clusters = useMemo(() => {
        if (chartData.length === 0) return [];
        return Object.keys(chartData[0]).filter(k => k !== 'year');
    }, [chartData]);


    if (chartData.length === 0) {
        return <div className="text-gray-500 italic p-4 text-center">Loading Data...</div>;
    }

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="year"
                        tick={{ fill: '#6B7280' }}
                        axisLine={{ stroke: '#D1D5DB' }}
                    />
                    <YAxis
                        tick={{ fill: '#6B7280' }}
                        axisLine={{ stroke: '#D1D5DB' }}
                        tickFormatter={(val) => Number.isInteger(val) ? val : val.toFixed(1)}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [Number(value).toFixed(2), '']}
                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <ReferenceLine
                        x={year}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        label={{ value: String(year), position: 'insideTopRight', fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                    />
                    {clusters.map((clusterName, i) => (
                        <Line
                            key={clusterName}
                            type="monotone"
                            dataKey={clusterName}
                            stroke={clusterColors[i % clusterColors.length]}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            name={clusterName}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
