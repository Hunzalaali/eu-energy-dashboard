import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

interface TransitionFlowChartProps {
    data: ClusteredData[];
    selectedCountry: string | null;
    clusterNames?: Record<number, string>;
}

export const TransitionFlowChart = ({ data, selectedCountry, clusterNames }: TransitionFlowChartProps) => {

    const chartData = useMemo(() => {
        if (!selectedCountry) {
            // Aggregate view: counts of named clusters per year
            const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
            const allClusters = Array.from(new Set(data.map(d => d.cluster))).sort();
            return years.map(year => {
                const yearData = data.filter(d => d.year === year);
                const entry: any = { year };
                allClusters.forEach(c => {
                    const label = clusterNames?.[c] || `Cluster ${c}`;
                    entry[label] = yearData.filter(d => d.cluster === c).length;
                });
                return entry;
            });
        }

        const countryData = data
            .filter(d => d.country === selectedCountry)
            .sort((a, b) => a.year - b.year);

        return countryData.map(d => ({
            year: d.year,
            cluster: d.cluster,
            clusterLabel: clusterNames?.[d.cluster] || `Cluster ${d.cluster}`,
        }));
    }, [data, selectedCountry, clusterNames]);

    const clusters = useMemo(() => Array.from(new Set(data.map(d => d.cluster))).sort(), [data]);


    if (!selectedCountry) {
        return (
            <Paper shadow="xs" p="md" withBorder h="100%">
                <Title order={4} mb="md">Cluster Distribution Over Time</Title>
                <Text size="xs" c="dimmed" mb="md">
                    How many countries belong to each energy cluster per year
                </Text>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {clusters.map((c) => (
                            <Bar
                                key={c}
                                dataKey={clusterNames?.[c] || `Cluster ${c}`}
                                stackId="a"
                                fill={getClusterColorById(c, clusterNames)}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        );
    }

    // ----- Country selected: Transition Path -----
    // Show a swimlane-style timeline with coloured dots and the cluster name
    const uniqueClusterIds = Array.from(new Set(chartData.map((d: any) => d.cluster))).sort() as number[];

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Group justify="space-between" mb="xs">
                <Title order={4}>Cluster Transition Path: {selectedCountry}</Title>
            </Group>
            <Text size="xs" c="dimmed" mb="md">
                Timeline showing which energy cluster {selectedCountry} belonged to each year.
            </Text>

            {/* Legend */}
            <Group gap="xs" mb="sm" wrap="wrap">
                {uniqueClusterIds.map(c => (
                    <Badge
                        key={c}
                        size="xs"
                        variant="light"
                        style={{ backgroundColor: getClusterColorById(c, clusterNames) + '22', color: getClusterColorById(c, clusterNames), border: `1px solid ${getClusterColorById(c, clusterNames)}55` }}
                    >
                        {clusterNames?.[c] || `Cluster ${c}`}
                    </Badge>
                ))}
            </Group>

            <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 8 }}>
                {chartData.map((d: any, i: number) => {
                    const color = getClusterColorById(d.cluster, clusterNames);
                    const prevCluster = i > 0 ? (chartData[i - 1] as any).cluster : null;
                    const changed = prevCluster !== null && prevCluster !== d.cluster;
                    return (
                        <div key={d.year} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ textAlign: 'center', minWidth: 56 }}>
                                <Text size="xs" c="dimmed" mb={4}>{d.year}</Text>
                                <div
                                    title={d.clusterLabel}
                                    style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        backgroundColor: color,
                                        margin: '0 auto',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 11,
                                        boxShadow: changed ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
                                        transition: 'box-shadow 0.2s',
                                    }}
                                >
                                    {d.cluster}
                                </div>
                                {changed && (
                                    <Text size="xs" c="red" fw={700} mt={2}>↑</Text>
                                )}
                            </div>
                            {i < chartData.length - 1 && (
                                <div style={{
                                    height: 2, width: 20, flexShrink: 0,
                                    backgroundColor: getClusterColorById((chartData[i + 1] as any).cluster, clusterNames),
                                    opacity: 0.4,
                                    marginBottom: changed ? 12 : 0,
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </Paper>
    );
};
