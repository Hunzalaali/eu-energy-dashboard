import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Paper, Title, Text, Box } from '@mantine/core';
import type { SectoralDataWithTargets } from '../data/useSectoralData';

interface GoalTrackingChartProps {
    data: SectoralDataWithTargets[];
    selectedCountry: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        
        return (
            <Paper shadow="md" p="sm" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Text fw={700} mb="xs">Year: {label}</Text>
                {payload.map((p: any) => {
                    if (p.value === undefined) return null;

                    let percentageText = null;
                    if (p.dataKey === 'total' && dataPoint.emissionsVs1990 !== undefined) {
                        percentageText = `(${dataPoint.emissionsVs1990 > 0 ? '+' : ''}${dataPoint.emissionsVs1990.toFixed(1)}% vs 1990)`;
                    } else if (p.dataKey === 'projectedTrend' && dataPoint.projectedTrendVs1990 !== undefined) {
                        percentageText = `(${dataPoint.projectedTrendVs1990 > 0 ? '+' : ''}${dataPoint.projectedTrendVs1990.toFixed(1)}% vs 1990)`;
                    }

                    return (
                        <div key={p.dataKey} style={{ color: p.color, fontSize: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600 }}>{p.name}:</span> {Number(p.value).toFixed(1)} MtCO₂eq
                            {percentageText && (
                                <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>
                                    {percentageText}
                                </span>
                            )}
                        </div>
                    );
                })}
            </Paper>
        );
    }
    return null;
};

export const GoalTrackingChart = ({ data, selectedCountry }: GoalTrackingChartProps) => {

    // Extend data to 2050 visually by adding empty points with just targets
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // We can reverse-engineer the 1990 baseline total from the 2030 target (which is 45% of baseline)
        const baselineTotal = data[0].target2030 / 0.45;

        // Only show from 2010 onwards for consistency
        const base = [...data]
            .filter(d => d.year >= 2010)
            .map(d => ({ 
                ...d, 
                projectedTrend: undefined as number | undefined,
                projectedTrendVs1990: undefined as number | undefined
            }));
        if (base.length === 0) return [];
        const lastYear = base[base.length - 1];

        // Use the entire historical period to calculate the true structural trend
        // (prevents the 2020 COVID shock from creating an artificially steep 10yr slope)
        const pastYear = base[0]; // Usually 2010
        
        let slope = 0;
        if (lastYear.year !== pastYear.year) {
            slope = (lastYear.total - pastYear.total) / (lastYear.year - pastYear.year);
        }

        // Start projection from the last actual point
        lastYear.projectedTrend = lastYear.total;
        lastYear.projectedTrendVs1990 = lastYear.emissionsVs1990;

        const proj2030 = Math.max(0, lastYear.total + slope * (2030 - lastYear.year));
        base.push({
            ...lastYear,
            year: 2030,
            total: undefined as any, // don't draw actual emissions line here
            projectedTrend: proj2030,
            projectedTrendVs1990: ((proj2030 - baselineTotal) / baselineTotal) * 100,
        });

        const proj2050 = Math.max(0, lastYear.total + slope * (2050 - lastYear.year));
        base.push({
            ...lastYear,
            year: 2050,
            total: undefined as any,
            projectedTrend: proj2050,
            projectedTrendVs1990: ((proj2050 - baselineTotal) / baselineTotal) * 100,
        });

        return base;
    }, [data]);

    return (
        <Paper shadow="sm" p="md" withBorder h="100%">
            <Box mb="sm">
                <Title order={5}>Goal Tracking: "The Implementation Gap"</Title>
                <Text size="xs" c="dimmed">
                    Progression towards 2030 (−55%) and 2050 (Net Zero) targets for {selectedCountry || "EU"}
                </Text>
            </Box>

            <ResponsiveContainer width="100%" height={250}>
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        type="number"
                        domain={[2010, 2050]}
                        ticks={[2010, 2015, 2020, 2025, 2030, 2040, 2050]}
                    />
                    <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Actual trajectory */}
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="Actual Emissions"
                        stroke="#1c7ed6"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />

                    {/* Target Trajectories */}
                    <Line
                        type="monotone"
                        dataKey="target2030"
                        name="2030 Target Path"
                        stroke="#f08c00"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="target2050"
                        name="2050 Target Path"
                        stroke="#2f9e44"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />

                    {/* Projected Trend */}
                    <Line
                        type="monotone"
                        dataKey="projectedTrend"
                        name="Projected Trend (Historical)"
                        stroke="#e03131"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                    />

                    <ReferenceLine x={2030} stroke="#f08c00" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: '2030', fill: '#f08c00', fontSize: 12 }} />
                    <ReferenceLine x={2050} stroke="#2f9e44" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: '2050', fill: '#2f9e44', fontSize: 12 }} />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
