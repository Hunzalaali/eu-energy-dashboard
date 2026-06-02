import { useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Paper, Title, Text, Box, Group, Select } from '@mantine/core';
import type { EnergyData } from '../data/useEnergyData';
import type { ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

interface SocioEnergyScatterProps {
    typoData: EnergyData[];
    energyData: ClusteredData[];
    energyClusterNames: Record<number, string>;
    year: number;
}

const SOCIO_X_OPTIONS = [
    { value: 'gdp_pps',     label: 'Wealth (GDP per capita, PPS)' },
    { value: 'mfg_share',   label: 'Industrial Structure (Mfg %)' },
    { value: 'urb_rate',    label: 'Urbanisation Rate (%)' },
    { value: 'hdd',         label: 'Climate — Heating Degree Days' },
    { value: 'pop_density', label: 'Population Density' },
];

const ENERGY_Y_OPTIONS = [
    { value: 'renewable_share', label: 'Renewable Share (%)' },
    { value: 'fossil_share',    label: 'Fossil Fuel Share (%)' },
    { value: 'ghg_intensity',   label: 'GHG Intensity (tCO₂e/cap)' },
    { value: 'energy_intensity',label: 'Energy Intensity (toe/M€)' },
    { value: 'energy_dependency',label: 'Energy Import Dependency (%)' },
    { value: 'nuclear_share',   label: 'Nuclear Share (%)' },
];

const CustomDot = (props: any) => {
    const { cx, cy, fill } = props;
    const r = 7;
    return (
        <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.85}
            stroke="#fff" strokeWidth={1.5} style={{ cursor: 'pointer' }} />
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.97)', border: '1px solid #dee2e6',
            borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: 12, minWidth: 180,
        }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{d.country}</div>
            <div style={{ color: '#495057' }}>Typology: <strong>{d.typologyName}</strong></div>
            <div style={{ color: '#495057' }}>Energy cluster: <strong>{d.energyClusterName}</strong></div>
            <div style={{ color: '#868e96', marginTop: 4 }}>X: {Number(d.x).toFixed(2)}</div>
            <div style={{ color: '#868e96' }}>Y: {Number(d.y).toFixed(2)}</div>
        </div>
    );
};

export const SocioEnergyScatter = ({
    typoData, energyData, energyClusterNames, year,
}: SocioEnergyScatterProps) => {

    const [xKey, setXKey] = useState('gdp_pps');
    const [yKey, setYKey] = useState('renewable_share');

    const { points, energyClusters, avgX, avgY } = useMemo(() => {
        // Join typology data with energy data on country
        const typoMap: Record<string, { clusterId: number; clusterName: string }> = {};
        typoData
            .filter(d => d.cluster !== undefined && d.cluster !== -1 && d.year === year)
            .forEach(d => {
                typoMap[d.country] = {
                    clusterId: d.cluster as number,
                    clusterName: (d.clusterName as string) || `Typology ${d.cluster}`,
                };
            });

        const pts = energyData
            .filter(d => d.year === year)
            .map(d => {
                const xSource = typoData.find(t => t.country === d.country && t.year === year);
                const x = xSource ? (xSource[xKey as keyof EnergyData] as number) : undefined;
                const y = d[yKey as keyof ClusteredData] as number | undefined;
                if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return null;
                return {
                    country: d.country,
                    x, y,
                    energyCluster: d.cluster,
                    energyClusterName: energyClusterNames[d.cluster] || `C${d.cluster}`,
                    typologyName: typoMap[d.country]?.clusterName || '—',
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        const clusters = Array.from(new Set(pts.map((p: any) => p.energyCluster))).sort() as number[];
        const meanX = pts.reduce((s: number, p: any) => s + p.x, 0) / (pts.length || 1);
        const meanY = pts.reduce((s: number, p: any) => s + p.y, 0) / (pts.length || 1);

        return { points: pts, energyClusters: clusters, avgX: meanX, avgY: meanY };
    }, [typoData, energyData, energyClusterNames, year, xKey, yKey]);

    const xLabel = SOCIO_X_OPTIONS.find(o => o.value === xKey)?.label ?? xKey;
    const yLabel = ENERGY_Y_OPTIONS.find(o => o.value === yKey)?.label ?? yKey;

    return (
        <Paper shadow="xs" p="md" withBorder>
            <Box mb="md">
                <Title order={5}>Socioeconomic Context vs Energy Metric ({year})</Title>
                <Text size="xs" c="dimmed">
                    Each dot is a country — coloured by its energy cluster. Use the drop-downs to
                    explore how structural factors correlate with energy outcomes.
                </Text>
            </Box>

            <Group gap="md" mb="md" align="flex-end">
                <div style={{ flex: 1, minWidth: 200 }}>
                    <Text size="xs" fw={500} mb={4}>X — Socioeconomic factor</Text>
                    <Select
                        size="xs"
                        data={SOCIO_X_OPTIONS}
                        value={xKey}
                        onChange={v => setXKey(v || 'gdp_pps')}
                    />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <Text size="xs" fw={500} mb={4}>Y — Energy outcome</Text>
                    <Select
                        size="xs"
                        data={ENERGY_Y_OPTIONS}
                        value={yKey}
                        onChange={v => setYKey(v || 'renewable_share')}
                    />
                </div>
            </Group>

            <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        type="number" dataKey="x"
                        name={xLabel}
                        label={{ value: xLabel, position: 'insideBottom', offset: -15, fontSize: 11, fill: '#868e96' }}
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis
                        type="number" dataKey="y"
                        name={yLabel}
                        label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#868e96' }}
                        tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                    {/* Mean crosshairs */}
                    <ReferenceLine x={avgX} stroke="#adb5bd" strokeDasharray="4 3" strokeWidth={1} />
                    <ReferenceLine y={avgY} stroke="#adb5bd" strokeDasharray="4 3" strokeWidth={1} />

                    {energyClusters.map(ec => {
                        const clusterPoints = points.filter((p: any) => p.energyCluster === ec);
                        const color = getClusterColorById(ec, energyClusterNames);
                        return (
                            <Scatter
                                key={ec}
                                name={energyClusterNames[ec] || `C${ec}`}
                                data={clusterPoints}
                                fill={color}
                                shape={<CustomDot />}
                            >
                                {clusterPoints.map((_: any, i: number) => (
                                    <Cell key={i} fill={color} />
                                ))}
                            </Scatter>
                        );
                    })}
                </ScatterChart>
            </ResponsiveContainer>

            <Text size="xs" c="dimmed" mt="xs" ta="center">
                Dashed lines = EU average. Hover over a country for details.
            </Text>
        </Paper>
    );
};
