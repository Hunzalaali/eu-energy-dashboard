import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, CartesianGrid,
} from 'recharts';
import { type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';

interface ClusterStabilityChartProps {
    data: ClusteredData[];           // all-years stable clustered data
    clusterNames?: Record<number, string>;
    selectedCountry?: string | null;
}

/**
 * Visualises how stable cluster assignments are across time.
 *
 * Two panels:
 *  1. A stacked bar showing how many countries stayed in each cluster per year.
 *  2. A line showing the total number of country-transitions per year
 *     (lower = more stable).
 */
export const ClusterStabilityChart = ({
    data,
    clusterNames,
    selectedCountry,
}: ClusterStabilityChartProps) => {
    const { selectedCluster, toggleCluster } = useInteraction();
    const { stabilityBars, transitionLine, totalTransitions } = useMemo(() => {
        if (!data || data.length === 0) return { stabilityBars: [], transitionLine: [], totalTransitions: 0 };

        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
        const clusters = Array.from(new Set(data.map(d => d.cluster))).sort();

        const bars: any[] = [];
        const lines: any[] = [];
        let total = 0;

        for (let i = 1; i < years.length; i++) {
            const prevYearData = data.filter(d => d.year === years[i - 1]);
            const currYearData = data.filter(d => d.year === years[i]);

            let transitions = 0;
            const stablePerCluster: Record<number, number> = {};
            const changedPerCluster: Record<number, number> = {};
            clusters.forEach(c => { stablePerCluster[c] = 0; changedPerCluster[c] = 0; });

            currYearData.forEach(curr => {
                const prev = prevYearData.find(p => p.country === curr.country);
                if (!prev) return;
                if (prev.cluster !== curr.cluster) {
                    transitions++;
                    changedPerCluster[curr.cluster] = (changedPerCluster[curr.cluster] ?? 0) + 1;
                } else {
                    stablePerCluster[curr.cluster] = (stablePerCluster[curr.cluster] ?? 0) + 1;
                }
            });

            total += transitions;

            const barEntry: any = { year: years[i] };
            clusters.forEach(c => {
                barEntry[`${clusterNames?.[c] ?? `C${c}`}`] = stablePerCluster[c] ?? 0;
            });
            barEntry['Switched'] = transitions;
            bars.push(barEntry);

            lines.push({ year: years[i], transitions });
        }

        return { stabilityBars: bars, transitionLine: lines, totalTransitions: total };
    }, [data, clusterNames]);

    const clusters = useMemo(() => Array.from(new Set(data.map(d => d.cluster))).sort(), [data]);
    const avgTransitions = transitionLine.length > 0
        ? (transitionLine.reduce((s, d) => s + d.transitions, 0) / transitionLine.length).toFixed(1)
        : '—';

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Group justify="space-between" mb="xs" align="flex-start">
                <div>
                    <Title order={4}>Cluster Stability Over Time</Title>
                    <Text size="xs" c="dimmed" mt={2}>
                        Countries remaining in the same cluster year-on-year vs those that switched.
                        Lower switches = more stable typology.
                    </Text>
                </div>
                <Badge color="teal" variant="light" size="sm">
                    avg {avgTransitions} switches/yr
                </Badge>
            </Group>

            {/* Stacked bar: stable per cluster + transitions */}
            <Text size="xs" fw={600} mb={4} c="dimmed">Country-cluster membership by year</Text>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stabilityBars} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {clusters.map(c => (
                        <Bar
                            key={c}
                            dataKey={clusterNames?.[c] ?? `C${c}`}
                            stackId="a"
                            fill={getClusterColorById(c, clusterNames)}
                            opacity={selectedCluster !== null && selectedCluster !== c ? 0.25 : 1}
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleCluster(c)}
                        />
                    ))}
                    <Bar dataKey="Switched" stackId="a" fill="#f1f3f5" stroke="#adb5bd" strokeWidth={1} />
                </BarChart>
            </ResponsiveContainer>

            {/* Line: transitions per year */}
            <Text size="xs" fw={600} mt="sm" mb={4} c="dimmed">Annual cluster transitions (lower = more stable)</Text>
            <ResponsiveContainer width="100%" height={120}>
                <LineChart data={transitionLine} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="transitions"
                        stroke="#f4a261"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Transitions"
                    />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};
