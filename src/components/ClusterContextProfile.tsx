import { useMemo } from 'react';
import { Paper, Title, Text, Box, Tooltip, Badge } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';
import type { ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';
import { formatCountryName } from './MapChart';


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
    const { selectedCluster, toggleCluster, selectedCountry } = useInteraction();

    // Find selected country's data for active year
    const selectedCountryData = useMemo(() => {
        if (!selectedCountry) return null;
        return typoData.find(d => d.country === selectedCountry && d.year === year) || null;
    }, [typoData, selectedCountry, year]);

    // Find which energy cluster selected country belongs to
    const selectedCountryCluster = useMemo(() => {
        if (!selectedCountry) return null;
        const eData = energyData.find(d => d.country === selectedCountry);
        return eData !== undefined ? eData.cluster : null;
    }, [energyData, selectedCountry]);

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
            // Avoid divide by zero
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            ranges[key] = { min, max };
        });

        return { clusterIds: ids, profile, ranges };
    }, [typoData, energyData, year]);

    if (clusterIds.length === 0) return null;

    const norm = (cid: number, key: string, customVal?: number) => {
        const { min, max } = ranges[key];
        const val = customVal !== undefined ? customVal : (profile[cid][key] ?? 0);
        if (max === min) return 0.5;
        return (val - min) / (max - min);
    };

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Box mb="sm">
                <Title order={5}>Cluster Socioeconomic Context ({year})</Title>
                <Text size="xs" c="dimmed">
                    Mean structural context variables per energy cluster explains why countries group together.
                </Text>
            </Box>

            <Box style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 440 }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: '8px 12px', textAlign: 'left', fontSize: 13,
                                color: '#4a4b4cff', fontWeight: 600, width: 220,
                                borderBottom: '1px solid rgba(100, 94, 94, 0.12)',
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
                                            borderBottom: '1px solid rgba(100, 94, 94, 0.12)',
                                            cursor: 'pointer',
                                            opacity: dimmed ? 0.3 : 1,
                                            transition: 'opacity 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                                            <span style={{ color, fontWeight: 700, fontSize: 12 }}>
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
                            <tr key={key} style={{ borderBottom: '1px solid rgba(131, 122, 122, 0.2)' }}>
                                <td style={{ padding: '10px 12px', fontSize: 12, color: '#67696cff', fontWeight: 600 }}>
                                    {label}
                                </td>
                                {clusterIds.map(cid => {
                                    const color = getClusterColorById(cid, energyClusterNames);
                                    const pct = Math.round(norm(cid, key) * 100);
                                    const dimmed = selectedCluster !== null && selectedCluster !== cid;
                                    
                                    const hasSelectedCountry = selectedCountryCluster === cid;
                                    let selectedCountryPct = 0;
                                    let selectedCountryValueStr = '';
                                    if (hasSelectedCountry && selectedCountryData) {
                                        const val = Number(selectedCountryData[key as keyof EnergyData]);
                                        if (!isNaN(val)) {
                                            selectedCountryPct = Math.min(100, Math.max(0, Math.round(norm(cid, key, val) * 100)));
                                            selectedCountryValueStr = format(val);
                                        }
                                    }

                                    return (
                                        <td key={cid} style={{
                                            padding: '6px 12px', textAlign: 'center',
                                            opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums', color: '#7e7777ff' }}>
                                                    {format(profile[cid]?.[key] ?? 0)}
                                                </Text>
                                                {hasSelectedCountry && selectedCountryData && (
                                                    <Tooltip label={`${formatCountryName(selectedCountry!)}: ${selectedCountryValueStr}`}>
                                                        <Badge size="xs" color="orange" variant="filled" style={{ fontSize: 9, padding: '0 4px', height: 14 }}>
                                                            {selectedCountry}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <div style={{
                                                width: 70, height: 10, borderRadius: 4,
                                                background: 'rgba(67, 64, 64, 0.08)', margin: '6px auto 0 auto', overflow: 'visible',
                                                position: 'relative',
                                            }}>
                                                <div style={{
                                                    width: `${pct}%`, height: '100%',
                                                    background: color, borderRadius: 3,
                                                    transition: 'width 0.5s ease',
                                                }} />
                                                {hasSelectedCountry && selectedCountryData && (
                                                    <Tooltip label={`${formatCountryName(selectedCountry!)}: ${selectedCountryValueStr}`}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: `calc(${selectedCountryPct}% - 4px)`,
                                                            top: -2,
                                                            width: 8, height: 12,
                                                            borderRadius: '50%',
                                                            background: '#ff922b',
                                                            border: '1px solid white',
                                                            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                                                            cursor: 'help',
                                                            zIndex: 2,
                                                        }} />
                                                    </Tooltip>
                                                )}
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
