import React, { useMemo } from 'react';
import { Paper, Title, Text, Box, Grid, Group } from '@mantine/core';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useInteraction } from '../context/InteractionContext';
import { formatCountryName } from './MapChart';
import { FEATURES, getMetricLabel, type ClusteredData } from '../services/analysis';

interface CountryTrajectoryProps {
    /** All years stable clustered dataset */
    data: ClusteredData[];
}

export const CountryTrajectory: React.FC<CountryTrajectoryProps> = ({ data }) => {
    const { selectedCountry } = useInteraction();

    const countryTimeline = useMemo(() => {
        if (!selectedCountry || !data || data.length === 0) return [];
        return data.filter(d => d.country === selectedCountry).sort((a, b) => a.year - b.year);
    }, [data, selectedCountry]);

    if (!selectedCountry) {
        return (
            <Paper shadow="xs" p="xl" withBorder style={{ textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
                <Text c="dimmed" size="sm" fw={500}>
                    Select a country in the sidebar to trace its temporal trajectory and feature sparklines.
                </Text>
            </Paper>
        );
    }

    if (countryTimeline.length === 0) {
        return (
            <Paper shadow="xs" p="md" withBorder>
                <Text c="dimmed" size="sm">No historical data available for {formatCountryName(selectedCountry)}.</Text>
            </Paper>
        );
    }

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Group justify="space-between" mb="md" align="flex-start">
                <div>
                    <Title order={4} mb={2}>Temporal Journey: {formatCountryName(selectedCountry)}</Title>
                    <Text size="xs" c="dimmed">
                        A detailed view of how {formatCountryName(selectedCountry)}'s energy profile evolved from 2010 to 2023.
                    </Text>
                </div>
            </Group>

            {/* 2. Sparklines Grid */}
            <Text size="11px" fw={700} c="dimmed" mb={8} style={{ letterSpacing: '0.05em' }}>
                KEY METRIC TRAJECTORIES
            </Text>
            <Grid gutter="md">
                {FEATURES.map(f => {
                    const values = countryTimeline.map(d => Number(d[f]) || 0);
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const firstVal = values[0] ?? 0;
                    const lastVal = values[values.length - 1] ?? 0;
                    const isUp = lastVal >= firstVal;
                    // For renewable_share, going up is good. For everything else (fossil, ghg, intensity, dependency), going down is good!
                    const isGood = f === 'renewable_share' ? isUp : !isUp;

                    return (
                        <Grid.Col key={f} span={{ base: 12, sm: 6, md: 4 }}>
                            <Paper p="xs" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <Text size="xs" fw={700} c="dimmed" mb={4} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {getMetricLabel(f).split(' (%)')[0].split(' (tCO')[0]}
                                </Text>
                                
                                <Box style={{ height: 60, position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={countryTimeline} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                                            <XAxis dataKey="year" hide />
                                            <YAxis domain={[minVal * 0.9, maxVal * 1.1]} hide />
                                            <RechartsTooltip 
                                                contentStyle={{ 
                                                    background: '#1e293b', 
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: 4,
                                                    padding: '4px 8px'
                                                }}
                                                labelStyle={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}
                                                itemStyle={{ fontSize: 10, color: isGood ? '#4ade80' : '#f87171', padding: 0 }}
                                                formatter={(value: number | string | undefined) => [`${Number(value ?? 0).toFixed(1)}${f.includes('share') || f.includes('dependency') ? '%' : ''}`, 'Value']}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey={f} 
                                                stroke={isGood ? '#37b24d' : '#f03e3e'} 
                                                strokeWidth={1.8} 
                                                dot={false}
                                                activeDot={{ r: 4, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>

                                <Group justify="space-between" mt={4}>
                                    <Text size="9px" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        2010: <strong>{firstVal.toFixed(1)}{f.includes('share') || f.includes('dependency') ? '%' : ''}</strong>
                                    </Text>
                                    <Text 
                                        size="9px" 
                                        fw={700} 
                                        c={isGood ? 'green' : 'red'} 
                                        style={{ fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        2023: {lastVal.toFixed(1)}{f.includes('share') || f.includes('dependency') ? '%' : ''}
                                    </Text>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    );
                })}
            </Grid>
        </Paper>
    );
};
