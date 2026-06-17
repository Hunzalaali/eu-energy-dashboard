import { Paper, Title, Text, Group, Badge, Stack, ThemeIcon, ActionIcon, Progress, Divider } from '@mantine/core';
import { IconX, IconLeaf, IconFlame, IconBolt, IconTarget, IconTrendingDown } from '@tabler/icons-react';
import { type ClusteredData, FEATURES, getMetricLabel } from '../services/analysis';
import { type SectoralDataWithTargets } from '../data/useSectoralData';
import { useInteraction } from '../context/InteractionContext';
import { formatCountryName } from './MapChart';

interface CountryDetailPanelProps {
    data: ClusteredData[];
    sectoralData: SectoralDataWithTargets[];
    clusterNames: Record<number, string>;
    countryCode?: string | null;
    onClose?: () => void;
}

const FEATURE_ICONS: Record<string, any> = {
    renewable_share: IconLeaf,
    fossil_share: IconFlame,
    nuclear_share: IconBolt,
    energy_dependency: IconTarget,
    ghg_intensity: IconTrendingDown,
    energy_intensity: IconBolt,
};

const FEATURE_COLORS: Record<string, string> = {
    renewable_share: 'teal',
    fossil_share: 'red',
    nuclear_share: 'violet',
    energy_dependency: 'orange',
    ghg_intensity: 'red',
    energy_intensity: 'orange',
    per_capita_toe: 'blue',
};

export const CountryDetailPanel = ({ data, sectoralData, clusterNames, countryCode, onClose }: CountryDetailPanelProps) => {
    const { selectedCountry, setSelectedCountry } = useInteraction();
    const effectiveCountry = countryCode !== undefined ? countryCode : selectedCountry;

    if (!effectiveCountry) return null;

    const countryData = data.find(d => d.country === effectiveCountry);
    if (!countryData) return null;

    const latestSectoral = sectoralData.length > 0
        ? sectoralData[sectoralData.length - 1] : null;

    // Compute percentile rank for each feature
    const percentiles: Record<string, number> = {};
    FEATURES.forEach(f => {
        const values = data.map(d => Number(d[f]) || 0).sort((a, b) => a - b);
        const val = Number(countryData[f]) || 0;
        const rank = values.filter(v => v <= val).length;
        // If the value is exactly 0, the bar should be empty regardless of ties
        percentiles[f] = val === 0 ? 0 : Math.round((rank / values.length) * 100);
    });

    return (
        <Paper shadow="sm" p="md" withBorder radius="md"
            style={{ borderLeft: '4px solid #1971c2' }}
        >
            <Group justify="space-between" mb="sm">
                <Group gap="xs">
                    <Title order={4}>{formatCountryName(effectiveCountry)}</Title>
                    <Badge
                        size="sm"
                        color={['red', 'indigo', 'blue', 'green'][countryData.cluster % 4]}
                    >
                        {clusterNames[countryData.cluster] || `C${countryData.cluster}`}
                    </Badge>
                </Group>
                <ActionIcon variant="subtle" onClick={onClose || (() => setSelectedCountry(null))} size="sm">
                    <IconX size={14} />
                </ActionIcon>
            </Group>

            <Stack gap="xs">
                {FEATURES.map(f => {
                    const val = Number(countryData[f]) || 0;
                    const pct = percentiles[f];
                    const Icon = FEATURE_ICONS[f] || IconBolt;


                    return (
                        <div key={f}>
                            <Group justify="space-between" mb={2}>
                                <Group gap={4}>
                                    <ThemeIcon size="xs" variant="transparent" color="gray">
                                        <Icon size={12} />
                                    </ThemeIcon>
                                    <Text size="xs" fw={500}>{getMetricLabel(f)}</Text>
                                </Group>
                                <Text size="xs" fw={700}>{f == 'per_capita_toe' ? val.toFixed(4) : val.toFixed(2)}</Text>
                            </Group>
                            <Progress
                                value={pct}
                                size="sm"
                                radius="xl"
                                color={FEATURE_COLORS[f] || 'blue'}
                            />
                        </div>
                    );
                })}
            </Stack>

            {latestSectoral && (
                <>
                    <Divider my="sm" />
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Emissions vs 1990</Text>
                        <Text size="xs" fw={700} c={latestSectoral.emissionsVs1990 < 0 ? 'teal' : 'red'}>
                            {latestSectoral.emissionsVs1990 > 0 ? '+' : ''}{latestSectoral.emissionsVs1990.toFixed(1)}%
                        </Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Total {latestSectoral.year}</Text>
                        <Text size="xs" fw={700}>{latestSectoral.total.toFixed(1)} MtCO₂eq</Text>
                    </Group>
                </>
            )}
        </Paper>
    );
};
