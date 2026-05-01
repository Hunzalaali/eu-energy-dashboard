import { useMemo } from 'react';
import { Paper, Title, Text, Box } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';
import type { ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';

/**
 * Cluster Socioeconomic Context Profile
 *
 * Shows mean values of all 5 secondary characterisation variables
 * (from thesis Section 3.3) per energy cluster, answering the question
 * "why do these countries cluster together?"
 *
 * Reference: Neto-Bradley et al. (2021). Energy transition pathways
 * using mixed-methods cluster analysis. Energy Strategy Reviews, 38, 100699.
 */

const SECONDARY_VARS: { key: string; label: string; format: (v: number) => string }[] = [
    { key: 'gdp_pps',     label: 'GDP per capita (PPS)',       format: v => `€${Math.round(v).toLocaleString()}` },
    { key: 'hdd',         label: 'Heating Degree Days',        format: v => Math.round(v).toString() },
    { key: 'urb_rate',    label: 'Urbanisation Rate',          format: v => `${v.toFixed(1)}%` },
    { key: 'mfg_share',   label: 'Manufacturing Share of GDP', format: v => `${v.toFixed(1)}%` },
    { key: 'pop_density', label: 'Population Density (/km²)',  format: v => Math.round(v).toString() },
];

interface Props {
    typoData: EnergyData[];
    energyData: ClusteredData[];
    energyClusterNames: Record<number, string>;
    year: number;
}

export const ClusterContextProfile = ({ typoData, energyData, energyClusterNames, year }: Props) => {
    const { selectedCluster, toggleCluster } = useInteraction();

    const { clusterIds, profile, ranges } = useMemo(() => {
        const ids = Array.from(new Set(energyData.map(d => d.cluster))).sort();

        // Build country→cluster lookup
        const countryCluster: Record<string, number> = {};
        energyData.forEach(d => { countryCluster[d.country] = d.cluster; });

        // Compute per-cluster mean of each secondary variable
        const profile: Record<number, Record<string, number>> = {};
        ids.forEach(cid => { profile[cid] = {}; });

        SECONDARY_VARS.forEach(({ key }) => {
            // Per-cluster totals
            const totals: Record<number, { sum: number; n: number }> = {};
            ids.forEach(cid => { totals[cid] = { sum: 0, n: 0 }; });

            typoData
                .filter(d => d.year === year)
                .forEach(d => {
                    const cid = countryCluster[d.country];
                    if (cid === undefined) return;
                    const val = Number(d[key as keyof EnergyData]);
                    if (!isNaN(val) && val > 0) {
                        totals[cid].sum += val;
                        totals[cid].n += 1;
                    }
                });

            ids.forEach(cid => {
                profile[cid][key] = totals[cid].n > 0 ? totals[cid].sum / totals[cid].n : 0;
            });
        });

        // Min/max per variable for normalising bar widths
        const ranges: Record<string, { min: number; max: number }> = {};
        SECONDARY_VARS.forEach(({ key }) => {
            const vals = ids.map(cid => profile[cid][key]);
            ranges[key] = { min: Math.min(...vals), max: Math.max(...vals) };
        });

        return { clusterIds: ids, profile, ranges };
    }, [typoData, energyData, year]);

    if (clusterIds.length === 0) return null;

    const norm = (cid: number, key: string) => {
        const { min, max } = ranges[key];
        if (max === min) return 0.5;
        return (profile[cid][key] - min) / (max - min);
    };

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Box mb="sm">
                <Title order={5}>Cluster Socioeconomic Context ({year})</Title>
                <Text size="xs" c="dimmed">
                    Mean structural context variables per energy cluster — explains <em>why</em> countries group together.
                    Click a cluster header to filter all views. (Neto-Bradley et al., 2021)
                </Text>
            </Box>

            <Box style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 440 }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: '6px 10px', textAlign: 'left', fontSize: 11,
                                color: '#868e96', fontWeight: 500, width: 190,
                                borderBottom: '1px solid rgba(255,255,255,0.12)',
                            }}>
                                Variable
                            </th>
                            {clusterIds.map(cid => {
                                const color = getClusterColorById(cid, energyClusterNames);
                                const dimmed = selectedCluster !== null && selectedCluster !== cid;
                                return (
                                    <th key={cid}
                                        onClick={() => toggleCluster(cid)}
                                        style={{
                                            padding: '8px 12px', textAlign: 'center', fontSize: 10,
                                            borderBottom: '1px solid rgba(255,255,255,0.12)',
                                            cursor: 'pointer',
                                            opacity: dimmed ? 0.3 : 1,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                            <span style={{ color, fontWeight: 700 }}>
                                                {energyClusterNames[cid] || `C${cid}`}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {SECONDARY_VARS.map(({ key, label, format }) => (
                            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ padding: '8px 10px', fontSize: 11, color: '#adb5bd', fontWeight: 500 }}>
                                    {label}
                                </td>
                                {clusterIds.map(cid => {
                                    const color = getClusterColorById(cid, energyClusterNames);
                                    const pct = Math.round(norm(cid, key) * 100);
                                    const dimmed = selectedCluster !== null && selectedCluster !== cid;
                                    return (
                                        <td key={cid} style={{
                                            padding: '6px 12px', textAlign: 'center',
                                            opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s',
                                        }}>
                                            <Text size="xs" fw={700} mb={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                {format(profile[cid]?.[key] ?? 0)}
                                            </Text>
                                            <div style={{
                                                width: 64, height: 5, borderRadius: 3,
                                                background: 'rgba(255,255,255,0.08)', margin: '0 auto', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`, height: '100%',
                                                    background: color, borderRadius: 3,
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Box>
        </Paper>
    );
};
