import { Paper, Title, Text, ScrollArea, Group, Tooltip } from '@mantine/core';
import { type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';

interface ClusterCompositionListProps {
    data: ClusteredData[];
    clusterNames?: Record<number, string>;
}

export const ClusterCompositionList = ({ data, clusterNames }: ClusterCompositionListProps) => {
    const { hoveredCountry, selectedCountry, setHoveredCountry, toggleCountry } = useInteraction();

    // Group by cluster
    const grouped = data.reduce((acc, curr) => {
        const cluster = curr.cluster;
        if (!acc[cluster]) acc[cluster] = [];
        acc[cluster].push(curr.country);
        return acc;
    }, {} as Record<number, string[]>);

    const clusters = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    return (
        <Paper shadow="xs" p="md" withBorder style={{ maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <Title order={4} mb="xs">Cluster Composition</Title>
            <Text size="xs" c="dimmed" mb="md">Countries assigned to each energy cluster for the selected year</Text>
            <ScrollArea flex={1}>
                {clusters.map(clusterId => {
                    const color = getClusterColorById(clusterId, clusterNames);
                    const name = clusterNames?.[clusterId] || `Cluster ${clusterId}`;
                    const countries = grouped[clusterId];

                    return (
                        <div key={clusterId} style={{ marginBottom: 20 }}>
                            {/* Cluster header */}
                            <Group mb={8} gap="sm" align="center">
                                <div style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    flexShrink: 0,
                                    boxShadow: `0 0 0 3px ${color}30`,
                                }} />
                                <Text fw={700} size="sm" style={{ color }}>
                                    {name}
                                </Text>
                                <div style={{
                                    marginLeft: 'auto',
                                    background: color + '18',
                                    border: `1px solid ${color}44`,
                                    borderRadius: 10,
                                    padding: '1px 8px',
                                }}>
                                    <Text size="xs" fw={600} style={{ color }}>
                                        {countries.length} {countries.length === 1 ? 'country' : 'countries'}
                                    </Text>
                                </div>
                            </Group>

                            {/* Country pills */}
                            <Group gap={6} style={{ paddingLeft: 8 }}>
                                {countries.sort().map(country => {
                                    const isHovered = hoveredCountry === country;
                                    const isSelected = selectedCountry === country;
                                    const isActive = isHovered || isSelected;

                                    return (
                                        <Tooltip key={country} label={country} openDelay={300}>
                                            <div
                                                onMouseEnter={() => setHoveredCountry(country)}
                                                onMouseLeave={() => setHoveredCountry(null)}
                                                onClick={() => toggleCountry(country)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '3px 10px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: isActive ? 700 : 400,
                                                    background: isActive ? color : color + '14',
                                                    color: isActive ? '#fff' : color,
                                                    border: `1px solid ${color}${isActive ? 'ff' : '44'}`,
                                                    transition: 'all 0.15s ease',
                                                    userSelect: 'none',
                                                    boxShadow: isSelected ? `0 0 0 2px ${color}66` : 'none',
                                                }}
                                            >
                                                {country}
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </Group>

                            {/* Divider */}
                            {clusterId !== clusters[clusters.length - 1] && (
                                <div style={{
                                    marginTop: 16,
                                    height: 1,
                                    background: 'linear-gradient(to right, transparent, #e9ecef, transparent)',
                                }} />
                            )}
                        </div>
                    );
                })}
            </ScrollArea>
        </Paper>
    );
};
