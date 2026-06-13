import React, { useMemo } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';
import { useInteraction } from '../context/InteractionContext';

/**
 * Typology Radar Chart
 *
 * Displays the socioeconomic profile of the four 2×2 typology quadrants:
 *   • Wealthy Warm   — High GDP, Low HDD
 *   • Wealthy Cold   — High GDP, High HDD
 *   • Developing Warm — Low GDP, Low HDD
 *   • Developing Cold — Low GDP, High HDD
 *
 * Axes plotted are the five structural context features so users can see
 * what makes each quadrant structurally distinct.
 */

interface TypologyRadarChartProps {
    data: EnergyData[] | null | undefined;
    year: number;
}

// Semantic colour palette matching the 2×2 quadrant order (IDs 0–3)
const TYPO_COLORS = ['#ff922b', '#339af0', '#c92a2a', '#5f3dc4'];
const TYPO_NAMES  = ['Wealthy Warm', 'Wealthy Cold', 'Developing Warm', 'Developing Cold'];

const FEATURES = ['gdp_pps', 'mfg_share', 'urb_rate', 'hdd', 'pop_density'] as const;
const FEATURE_LABELS: Record<string, string> = {
    gdp_pps:     'GDP (PPS)',
    mfg_share:   'Industry Share (%)',
    urb_rate:    'Urbanisation (%)',
    hdd:         'Heating Degree Days',
    pop_density: 'Population Density',
};

export const TypologyRadarChart: React.FC<TypologyRadarChartProps> = ({ data, year }) => {
    const { selectedCountry } = useInteraction();

    const selectedTypology = useMemo(() => {
        if (!selectedCountry || !data || data.length === 0) return null;
        const countryRow = data.find(d => d.country === selectedCountry && d.year === year);
        if (!countryRow || countryRow.cluster === undefined || countryRow.cluster === -1) return null;
        return TYPO_NAMES[countryRow.cluster as number] || null;
    }, [data, selectedCountry, year]);

    const radarData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const yearData = data.filter(d => d.year === year && d.cluster !== undefined && d.cluster !== -1);
        if (yearData.length === 0) return [];

        const typologyIds = [0, 1, 2, 3];

        // Min-Max scaling per feature for radar display (0–100)
        const rawMatrix = yearData.map(row => FEATURES.map(f => (row[f] ?? 0) as number));
        const mins = FEATURES.map((_, i) => Math.min(...rawMatrix.map(r => r[i])));
        const maxs = FEATURES.map((_, i) => Math.max(...rawMatrix.map(r => r[i])));
        const scale = (val: number, i: number) => {
            const range = maxs[i] - mins[i];
            return range === 0 ? 50 : ((val - mins[i]) / range) * 100;
        };

        // Compute scaled averages per typology
        const scaledSums: Record<number, number[]> = {};
        const counts: Record<number, number> = {};
        typologyIds.forEach(id => { scaledSums[id] = new Array(FEATURES.length).fill(0); counts[id] = 0; });

        yearData.forEach(row => {
            const c = row.cluster as number;
            if (!(c in scaledSums)) return;
            FEATURES.forEach((f, i) => {
                scaledSums[c][i] += scale((row[f] ?? 0) as number, i);
            });
            counts[c]++;
        });

        typologyIds.forEach(id => {
            if (counts[id] > 0) {
                FEATURES.forEach((_, i) => { scaledSums[id][i] /= counts[id]; });
            }
        });

        return FEATURES.map((f, i) => {
            const point: any = { subject: FEATURE_LABELS[f] };
            typologyIds.forEach(id => {
                if (counts[id] > 0) {
                    point[TYPO_NAMES[id]] = Math.round(scaledSums[id][i]);
                }
            });
            return point;
        });
    }, [data, year]);

    // Only render typologies that have at least one country
    const presentTypologies = useMemo(() => {
        if (radarData.length === 0) return [];
        return TYPO_NAMES.filter(name => radarData[0]?.[name] !== undefined);
    }, [radarData]);

    if (radarData.length === 0) {
        return (
            <Paper shadow="xs" p="md" withBorder>
                <Text c="dimmed" size="sm">No typology data for {year}.</Text>
            </Paper>
        );
    }

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={5} mb="xs">Typology Structural Profiles</Title>
            <Text size="xs" c="dimmed" mb="sm">
                Relative socioeconomic and climate profile per typology quadrant (0–100 scaled).
            </Text>

            {/* Legend badges */}
            <Group gap="xs" mb="sm" wrap="wrap">
                {presentTypologies.map((name) => {
                    const isSelected = selectedTypology === name;
                    const idx = TYPO_NAMES.indexOf(name);
                    return (
                        <Badge
                            key={name} size="xs" variant={isSelected ? "filled" : "light"}
                            style={{
                                color: isSelected ? '#fff' : TYPO_COLORS[idx],
                                background: isSelected ? TYPO_COLORS[idx] : TYPO_COLORS[idx] + '22',
                                border: `1px solid ${TYPO_COLORS[idx]}44`,
                                transform: isSelected ? 'scale(1.05)' : 'none',
                                fontWeight: isSelected ? 700 : 500,
                            }}
                        >
                            {name} {isSelected ? `(contains ${selectedCountry})` : ''}
                        </Badge>
                    );
                })}
            </Group>

            <ResponsiveContainer width="100%" height={320}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip formatter={(value: any) => [`${value} (relative)`, '']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {presentTypologies.map(name => {
                        const isSelected = selectedTypology === name;
                        const idx = TYPO_NAMES.indexOf(name);
                        return (
                            <Radar
                                key={name} name={name} dataKey={name}
                                stroke={TYPO_COLORS[idx]}
                                fill={TYPO_COLORS[idx]}
                                strokeWidth={isSelected ? 3 : 1.5}
                                fillOpacity={isSelected ? 0.55 : 0.15}
                            />
                        );
                    })}
                </RadarChart>
            </ResponsiveContainer>

            {/* Framework explanation */}
            <Text size="xs" c="dimmed" mt="sm" style={{ lineHeight: 1.5 }}>
                <strong>2×2 framework:</strong> Countries are assigned to one of four non-overlapping quadrants
                based on <em>GDP per capita (PPS)</em> and <em>Heating Degree Days (HDD)</em>, split at the
                EU-27 median. GDP captures economic capacity for energy transition; HDD captures structural
                heating demand driven by climate.
            </Text>
        </Paper>
    );
};
