import { SimpleGrid, Paper, Text, Group, ThemeIcon } from '@mantine/core';
import { IconLeaf, IconTarget, IconTrendingDown } from '@tabler/icons-react';
import { type EnergyData } from '../services/analysis';
import type { SectoralDataWithTargets } from '../data/useSectoralData';

interface KPICardsProps {
    data: EnergyData[];
    sectoralData: SectoralDataWithTargets[];
}

export const KPICards = ({ data, sectoralData }: KPICardsProps) => {
    if (data.length === 0 || sectoralData.length === 0) return null;

    const latestYear = Math.max(...data.map(d => d.year));
    const latestData = data.filter(d => d.year === latestYear);
    const latestSectoral = sectoralData.find(d => d.year === latestYear);

    const avgRenewable = latestData.reduce((acc, curr) => acc + (curr.renewable_share || 0), 0) / latestData.length;

    // Fallbacks if no valid sectoral match
    const emissionsVs1990 = latestSectoral ? latestSectoral.emissionsVs1990 : 0;
    const currentEmissions = latestSectoral ? latestSectoral.total : 0;
    const target2030 = latestSectoral ? latestSectoral.target2030 : 0;
    const distanceToTarget = currentEmissions - target2030;
    const distancePercent = target2030 > 0 ? (distanceToTarget / latestSectoral!.total) * 100 : 0;

    const stats = [
        {
            label: `Total Emissions vs 1990`,
            value: `${emissionsVs1990 > 0 ? '+' : ''}${emissionsVs1990.toFixed(1)}%`,
            icon: IconTrendingDown,
            color: emissionsVs1990 < 0 ? 'teal' : 'red'
        },
        {
            label: `Renewable Share (${latestYear})`,
            value: `${avgRenewable.toFixed(1)}%`,
            icon: IconLeaf,
            color: 'teal'
        },
        {
            label: `Distance to 2030 Target`,
            value: distanceToTarget > 0 ? `${distancePercent.toFixed(1)}% gap` : 'Target Met 🎉',
            icon: IconTarget,
            color: distanceToTarget > 0 ? 'orange' : 'green'
        }
    ];

    return (
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {stats.map((stat) => (
                <Paper shadow="sm" withBorder p="md" radius="md" key={stat.label}>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                            {stat.label}
                        </Text>
                        <ThemeIcon color={stat.color} variant="light" size="lg">
                            <stat.icon size={20} stroke={1.5} />
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
