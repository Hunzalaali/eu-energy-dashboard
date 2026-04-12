import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Paper, Title, Text, Group } from '@mantine/core';
import { type ClusteredData } from '../services/analysis';
import { useInteraction } from '../context/InteractionContext';
import { getClusterColorById } from '../utils/clusterColors';

interface ClusterScatterPlotProps {
    data: ClusteredData[];
    method?: 'umap' | 'tsne';
    clusterNames?: Record<number, string>;
}

export const ClusterScatterPlot = ({ data, method = 'umap', clusterNames }: ClusterScatterPlotProps) => {
    const { hoveredCountry, selectedCountry, selectedCluster, setHoveredCountry, toggleCountry } = useInteraction();

    const chartData = useMemo(() => {
        return data.map(d => ({
            ...d,
            x: method === 'umap' ? d.umapX : d.tsneX,
            y: method === 'umap' ? d.umapY : d.tsneY,
        }));
    }, [data, method]);

    const clusters = useMemo(() =>
        Array.from(new Set(data.map(d => d.cluster))).sort(),
        [data]
    );

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Group justify="space-between" mb="md">
                <Title order={4}>Cluster Projection ({method.toUpperCase()})</Title>
                <Text size="xs" c="dimmed">
                    {hoveredCountry || selectedCountry ? `🔗 ${hoveredCountry || selectedCountry}` : `${data.length} countries`}
                </Text>
            </Group>

            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" dataKey="x" name="X" hide />
                    <YAxis type="number" dataKey="y" name="Y" hide />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <Paper p="xs" shadow="xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                                        <Text fw={700} size="sm">{d.country}</Text>
                                        <Text size="xs">Cluster {d.cluster}</Text>
                                    </Paper>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend />
                    {clusters.map((clusterId) => {
                        const clusterData = chartData.filter(d => d.cluster === clusterId);
                        const isClusterDimmed = selectedCluster !== null && selectedCluster !== clusterId;

                        return (
                            <Scatter
                                key={clusterId}
                                name={clusterNames?.[clusterId] || `C${clusterId}`}
                                data={clusterData}
                                fill={getClusterColorById(clusterId, clusterNames)}
                                fillOpacity={isClusterDimmed ? 0.1 : 1}
                                onMouseEnter={(e: any) => {
                                    if (e?.payload?.country) setHoveredCountry(e.payload.country);
                                }}
                                onMouseLeave={() => setHoveredCountry(null)}
                                onClick={(e: any) => {
                                    if (e?.payload?.country) toggleCountry(e.payload.country);
                                }}
                                cursor="pointer"
                            >
                                {clusterData.map((entry, idx) => {
                                    const isHighlighted = entry.country === hoveredCountry || entry.country === selectedCountry;
                                    return (
                                        <Cell
                                            key={idx}
                                            r={isHighlighted ? 9 : 5}
                                            fill={getClusterColorById(clusterId, clusterNames)}
                                            stroke={isHighlighted ? '#e03131' : '#fff'}
                                            strokeWidth={isHighlighted ? 3 : 1}
                                            style={{ transition: 'all 0.2s' }}
                                        />
                                    );
                                })}
                            </Scatter>
                        );
                    })}
                </ScatterChart>
            </ResponsiveContainer>
        </Paper>
    );
};
