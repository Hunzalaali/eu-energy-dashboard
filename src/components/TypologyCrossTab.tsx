import { useMemo } from 'react';
import { Paper, Title, Text, Box, Group, Badge, Tooltip } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';
import type { ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';

interface TypologyCrossTabProps {
    /** Full dataset with typology cluster (cluster, clusterName) from useEnergyData */
    typoData: EnergyData[];
    /** Per-year energy-clustered data (from performAnalysis for a specific year) */
    energyData: ClusteredData[];
    /** Energy cluster names, e.g. { 0: 'Green Pioneers', 1: 'Carbon Intensive' } */
    energyClusterNames: Record<number, string>;
    year: number;
}

/** Colour palette for the four socioeconomic typologies (Semantic: Warm/Cold tones) */
const TYPO_COLORS = ['#ff922b', '#339af0', '#c92a2a', '#5f3dc4'];

export const TypologyCrossTab = ({
    typoData, energyData, energyClusterNames, year,
}: TypologyCrossTabProps) => {
    const { selectedCountry } = useInteraction();

    const { matrix, typologyNames, energyClusters } = useMemo(() => {
        // 1. Get the typology assignment for each country (from latest year in typoData)
        const typoRow: Record<string, { clusterId: number; clusterName: string }> = {};
        typoData
            .filter(d => d.cluster !== undefined && d.cluster !== -1 && d.year === year)
            .forEach(d => {
                typoRow[d.country] = {
                    clusterId:   d.cluster as number,
                    clusterName: (d.clusterName as string) || `Typology ${d.cluster}`,
                };
            });

        // 2. Get the energy assignment for each country in the selected year
        const energyRow: Record<string, number> = {};
        energyData.forEach(d => { energyRow[d.country] = d.cluster; });

        // 3. Unique sorted lists
        const allTypoNames = Array.from(
            new Map(Object.values(typoRow).map(v => [v.clusterId, v.clusterName]))
        ).sort((a, b) => a[0] - b[0]).map(([, n]) => n);

        const allEnergyClusters = Array.from(new Set(energyData.map(d => d.cluster))).sort();

        // 4. Build count matrix [typology][energy cluster] = country list
        const mat: Record<string, Record<number, string[]>> = {};
        allTypoNames.forEach(t => {
            mat[t] = {};
            allEnergyClusters.forEach(e => { mat[t][e] = []; });
        });

        Object.entries(typoRow).forEach(([country, typo]) => {
            const eCluster = energyRow[country];
            if (eCluster !== undefined && mat[typo.clusterName]) {
                mat[typo.clusterName][eCluster]?.push(country);
            }
        });

        // 5. Max count for colour scaling
        const allCounts = Object.values(mat).flatMap(row => Object.values(row).map(c => c.length));
        const maxCount = Math.max(...allCounts, 1);

        return {
            matrix: mat,
            typologyNames: allTypoNames,
            energyClusters: allEnergyClusters,
            maxCount,
        };
    }, [typoData, energyData, energyClusterNames, year]);

    if (typologyNames.length === 0 || energyClusters.length === 0) {
        return (
            <Paper shadow="xs" p="md" withBorder>
                <Text c="dimmed" size="sm">No cross-tab data available for {year}.</Text>
            </Paper>
        );
    }

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Box mb="md">
                <Title order={5}>Typology × Energy Cluster Cross-Tab ({year})</Title>
                <Text size="xs" c="dimmed">
                    How socioeconomic typologies map onto energy clusters, each cell shows countries at the intersection.
                    Darker cells = more countries in common.
                </Text>
            </Box>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 400 }}>
                    <thead>
                        <tr>
                            {/* top-left corner */}
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 13, color: '#232426ff', fontWeight: 600, borderBottom: '2px solid rgba(40, 37, 37, 0.1)', borderRight: '2px solid rgba(40, 37, 37, 0.1)' }}>
                                Typology ↓ / Energy →
                            </th>
                            {energyClusters.map(ec => (
                                <th key={ec} style={{
                                    padding: '8px 12px', textAlign: 'center', fontSize: 12,
                                    borderBottom: '2px solid rgba(40, 37, 37, 0.1)',
                                }}>
                                    <div style={{
                                        display: 'inline-block',
                                        background: getClusterColorById(ec, energyClusterNames) + '22',
                                        color: getClusterColorById(ec, energyClusterNames),
                                        border: `1px solid ${getClusterColorById(ec, energyClusterNames)}55`,
                                        borderRadius: 4, padding: '2px 6px', fontWeight: 600, whiteSpace: 'nowrap',
                                    }}>
                                        {energyClusterNames[ec] || `C${ec}`}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {typologyNames.map((typo, typoIdx) => (
                            <tr key={typo}>
                                <td style={{
                                    padding: '10px 12px', fontWeight: 700, fontSize: 13,
                                    borderRight: '2px solid rgba(30, 30, 30, 0.1)',
                                    color: TYPO_COLORS[typoIdx % TYPO_COLORS.length],
                                    whiteSpace: 'nowrap',
                                }}>
                                    {typo}
                                </td>
                                {energyClusters.map(ec => {
                                    const countries = matrix[typo]?.[ec] ?? [];
                                    const count = countries.length;
                                    const intensity = count === 0 ? 0 : 0.08 + (count / Math.max(...Object.values(matrix[typo] ?? {}).map(c => c.length), 1)) * 0.72;
                                    const bgColor = count === 0
                                        ? 'rgba(41, 38, 38, 0.02)'
                                        : getClusterColorById(ec, energyClusterNames) + Math.round(intensity * 255).toString(16).padStart(2, '0');

                                    const isSelected = selectedCountry && countries.includes(selectedCountry);

                                    return (
                                        <td key={ec} style={{
                                            padding: '10px 12px', textAlign: 'center',
                                            borderBottom: '2px solid rgba(30, 30, 30, 0.1)',
                                            background: bgColor,
                                            transition: 'all 0.2s',
                                            minWidth: 90,
                                            ...(isSelected ? {
                                                outline: '3px solid #ff922b',
                                                outlineOffset: '-3px',
                                                position: 'relative',
                                                zIndex: 1,
                                                boxShadow: '0 0 10px rgba(255, 146, 43, 0.6)',
                                            } : {}),
                                        }}>
                                            <Tooltip
                                                label={
                                                    count === 0
                                                        ? 'No countries'
                                                        : countries.join(', ')
                                                }
                                                disabled={count === 0}
                                                multiline
                                                maw={280}
                                            >
                                                <div style={{ cursor: count > 0 ? 'help' : 'default' }}>
                                                    {count > 0 ? (
                                                        <>
                                                            <Text fw={800} size="md" style={{ color: intensity > 0.5 ? '#ffffff' : '#ffffffff' }}>
                                                                {count}
                                                            </Text>
                                                            <Text size="xs" style={{ color: intensity > 0.5 ? 'rgba(255, 255, 255, 1)' : '#ffffffff', lineHeight: 1.2 }}>
                                                                {countries.slice(0, 2).join(', ')}{count > 2 ? ` +${count - 2}` : ''}
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <Text size="sm" c="dimmed">—</Text>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Row totals legend */}
            <Group mt="md" gap="xs" wrap="wrap">
                {typologyNames.map((typo, i) => (
                    <Badge key={typo} size="xs" variant="light"
                        style={{ color: TYPO_COLORS[i % TYPO_COLORS.length], background: TYPO_COLORS[i % TYPO_COLORS.length] + '18', border: `1px solid ${TYPO_COLORS[i % TYPO_COLORS.length]}44` }}>
                        {typo} = {Object.values(matrix[typo] ?? {}).reduce((n, c) => n + c.length, 0)} countries
                    </Badge>
                ))}
            </Group>
        </Paper>
    );
};
