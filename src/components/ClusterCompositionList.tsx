import { Paper, Title, Badge, ScrollArea, Group, Text } from '@mantine/core';
import { type ClusteredData } from '../services/analysis';

interface ClusterCompositionListProps {
    data: ClusteredData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

export const ClusterCompositionList = ({ data }: ClusterCompositionListProps) => {

    // Group by cluster
    const grouped = data.reduce((acc, curr) => {
        const cluster = curr.cluster;
        if (!acc[cluster]) acc[cluster] = [];
        acc[cluster].push(curr.country);
        return acc;
    }, {} as Record<number, string[]>);

    const clusters = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    return (
        <Paper shadow="xs" p="md" withBorder h="100%" style={{ maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <Title order={4} mb="md">Cluster Composition</Title>
            <ScrollArea flex={1}>
                {clusters.map(clusterId => (
                    <div key={clusterId} style={{ marginBottom: 16 }}>
                        <Group mb="xs">
                            <Badge
                                color={COLORS[clusterId % COLORS.length]}
                                variant="filled"
                                size="lg"
                            >
                                Cluster {clusterId}
                            </Badge>
                            <Text size="xs" c="dimmed">{grouped[clusterId].length} Countries</Text>
                        </Group>
                        <Group gap="xs">
                            {grouped[clusterId].sort().map(country => (
                                <Text
                                    key={country}
                                    size="sm"
                                    bg="gray.1"
                                    p={3}
                                    px={6}
                                    style={{ borderRadius: 4, border: '1px solid #eee' }}
                                >
                                    {country}
                                </Text>
                            ))}
                        </Group>
                    </div>
                ))}
            </ScrollArea>
        </Paper>
    );
};
