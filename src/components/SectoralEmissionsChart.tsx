
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text, Box } from '@mantine/core';
import type { SectoralDataWithTargets } from '../data/useSectoralData';

interface SectoralEmissionsChartProps {
    data: SectoralDataWithTargets[];
    selectedCountry: string | null;
    highlightedSector: string | null;
}

const COLORS = {
    power: '#ffc078', // yellow-orange
    industry: '#ced4da', // grey
    buildings: '#4dabf7', // blue
    transport: '#ff8787', // red
    agriculture: '#b2f2bb' // green
};

export const SectoralEmissionsChart = ({ data, selectedCountry, highlightedSector }: SectoralEmissionsChartProps) => {

    return (
        <Paper shadow="sm" p="md" withBorder h="100%">
            <Box mb="sm">
                <Title order={5}>Sectoral Emissions Breakdown</Title>
                <Text size="xs" c="dimmed">
                    {selectedCountry ? `Decarbonization pathway for ${selectedCountry}` : 'EU Aggregate Approximation'} (2010–2023)
                </Text>
            </Box>

            <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                    data={data.filter(d => d.year >= 2010)}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" minTickGap={20} />
                    <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(value: any) => Number(value).toFixed(1)} />
                    <Legend />
                    <Area
                        type="monotone"
                        dataKey="agriculture"
                        stackId="1"
                        stroke={COLORS.agriculture}
                        fill={COLORS.agriculture}
                        fillOpacity={highlightedSector === 'agriculture' || !highlightedSector ? 0.8 : 0.2}
                    />
                    <Area
                        type="monotone"
                        dataKey="buildings"
                        stackId="1"
                        stroke={COLORS.buildings}
                        fill={COLORS.buildings}
                        fillOpacity={highlightedSector === 'buildings' || !highlightedSector ? 0.8 : 0.2}
                    />
                    <Area
                        type="monotone"
                        dataKey="transport"
                        stackId="1"
                        stroke={COLORS.transport}
                        fill={COLORS.transport}
                        fillOpacity={highlightedSector === 'transport' || !highlightedSector ? 0.8 : 0.2}
                    />
                    <Area
                        type="monotone"
                        dataKey="industry"
                        stackId="1"
                        stroke={COLORS.industry}
                        fill={COLORS.industry}
                        fillOpacity={highlightedSector === 'industry' || !highlightedSector ? 0.8 : 0.2}
                    />
                    <Area
                        type="monotone"
                        dataKey="power"
                        stackId="1"
                        stroke={COLORS.power}
                        fill={COLORS.power}
                        fillOpacity={highlightedSector === 'power' || !highlightedSector ? 0.8 : 0.2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Paper>
    );
};
