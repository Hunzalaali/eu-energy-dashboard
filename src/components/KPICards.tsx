import { SimpleGrid, Paper, Text, Group, ThemeIcon } from '@mantine/core';
import { IconLeaf, IconFlame, IconBolt, IconWorld } from '@tabler/icons-react';
import { type EnergyData } from '../services/analysis';

interface KPICardsProps {
    data: EnergyData[];
}

export const KPICards = ({ data }: KPICardsProps) => {
    if (data.length === 0) return null;

    // Calculate averages for the latest available year
    // For simplicity, let's take average over all years for the current selection (or we could select latest year)
    // Let's filter for the latest year present in the data for a better snapshot
    const latestYear = Math.max(...data.map(d => d.year));
    const latestData = data.filter(d => d.year === latestYear);

    const avgRenewable = latestData.reduce((acc, curr) => acc + curr.renewable_share, 0) / latestData.length;
    const avgFossil = latestData.reduce((acc, curr) => acc + curr.fossil_share, 0) / latestData.length;
    const avgDependency = latestData.reduce((acc, curr) => acc + curr.energy_dependency, 0) / latestData.length;
    const avgGHG = latestData.reduce((acc, curr) => acc + curr.ghg_intensity, 0) / latestData.length;

    const stats = [
        {
            label: `Renewable Share (${latestYear})`,
            value: `${avgRenewable.toFixed(1)}%`,
            icon: IconLeaf,
            color: 'teal'
        },
        {
            label: `Fossil Share (${latestYear})`,
            value: `${avgFossil.toFixed(1)}%`,
            icon: IconFlame,
            color: 'orange'
        },
        {
            label: `Energy Dependency (${latestYear})`,
            value: `${avgDependency.toFixed(1)}%`,
            icon: IconWorld,
            color: 'blue'
        },
        {
            label: `GHG Intensity (${latestYear})`,
            value: avgGHG.toFixed(1),
            icon: IconBolt,
            color: 'red'
        },
    ];

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            {stats.map((stat) => (
                <Paper withBorder p="md" radius="md" key={stat.label}>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            {stat.label}
                        </Text>
                        <ThemeIcon color={stat.color} variant="light">
                            <stat.icon size={18} />
                        </ThemeIcon>
                    </Group>

                    <Group align="flex-end" gap="xs" mt={25}>
                        <Text fw={700} size="xl">{stat.value}</Text>
                    </Group>
                </Paper>
            ))}
        </SimpleGrid>
    );
};
