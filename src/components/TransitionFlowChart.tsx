import { useMemo } from 'react';
import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';
import { useInteraction } from '../context/InteractionContext';
import { formatCountryName } from './MapChart';

interface TransitionFlowChartProps {
    data: ClusteredData[];
    selectedCountry: string | null;
    clusterNames?: Record<number, string>;
}

// ─── Aggregate: ThemeRiver-style stacked area ───────────────────────────────
const AggregateView = ({ data, clusterNames }: { data: ClusteredData[]; clusterNames?: Record<number, string> }) => {
    const { chartData, clusters } = useMemo(() => {
        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
        const clusterIds = Array.from(new Set(data.map(d => d.cluster))).sort();
        const rows = years.map(year => {
            const yearData = data.filter(d => d.year === year);
            const entry: Record<string, number | string> = { year };
            clusterIds.forEach(c => {
                entry[clusterNames?.[c] || `Cluster ${c}`] = yearData.filter(d => d.cluster === c).length;
            });
            return entry;
        });
        return { chartData: rows, clusters: clusterIds };
    }, [data, clusterNames]);

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={4} mb={4}>Cluster Distribution Over Time</Title>
            <Text size="xs" c="dimmed" mb="md">
                This chart shows how the number of EU countries in each energy cluster has changed from 2010 to 2023.
                A growing band means more countries moved into that cluster. Select a country in the sidebar to trace its cluster trajectory.
            </Text>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        {clusters.map(c => (
                            <linearGradient key={c} id={`grad-${c}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getClusterColorById(c, clusterNames)} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={getClusterColorById(c, clusterNames)} stopOpacity={0.55} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'Countries', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {clusters.map(c => (
                        <Area
                            key={c}
                            type="monotone"
                            dataKey={clusterNames?.[c] || `Cluster ${c}`}
                            stackId="1"
                            stroke={getClusterColorById(c, clusterNames)}
                            fill={`url(#grad-${c})`}
                            fillOpacity={1}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </Paper>
    );
};

// ─── Country: SVG Swimlane Storyline ────────────────────────────────────────
const SwimlaneView = ({
    data, selectedCountry, clusterNames,
}: { data: ClusteredData[]; selectedCountry: string; clusterNames?: Record<number, string> }) => {
    const { path, clusters, years } = useMemo(() => {
        const countryData = data
            .filter(d => d.country === selectedCountry)
            .sort((a, b) => a.year - b.year);
        const clusterIds = Array.from(new Set(data.map(d => d.cluster))).sort();
        const yearList = countryData.map(d => d.year);
        return { path: countryData, clusters: clusterIds, years: yearList };
    }, [data, selectedCountry]);

    if (path.length === 0) return null;

    const LANE_H = 68;
    const YEAR_LABEL_H = 28;
    const LABEL_W = 220;
    const DOT_R = 11;
    const SVG_H = YEAR_LABEL_H + clusters.length * LANE_H + 20;
    const MIN_W = 680;
    // Approx width based on years
    const SVG_W = Math.max(MIN_W, LABEL_W + years.length * 60);

    const yearX = (i: number) => LABEL_W + i * ((SVG_W - LABEL_W - 30) / Math.max(years.length - 1, 1));
    const laneY = (cid: number) => {
        const idx = clusters.indexOf(cid);
        return YEAR_LABEL_H + idx * LANE_H + LANE_H / 2;
    };

    // Build SVG path — cubic bezier for transitions, straight for stable
    const svgPathD = path.map((d, i) => {
        const cx = yearX(i);
        const cy = laneY(d.cluster);
        if (i === 0) return `M ${cx} ${cy}`;
        const prevCy = laneY(path[i - 1].cluster);
        const prevCx = yearX(i - 1);
        if (prevCy === cy) return `L ${cx} ${cy}`;
        const midX = (prevCx + cx) / 2;
        return `C ${midX} ${prevCy}, ${midX} ${cy}, ${cx} ${cy}`;
    }).join(' ');

    const transitions = path.filter((d, i) => i > 0 && d.cluster !== path[i - 1].cluster).length;

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Group justify="space-between" mb={4} align="flex-start">
                <div>
                    <Title order={4}>Cluster Transition Path: {formatCountryName(selectedCountry)}</Title>
                    <Text size="xs" c="dimmed">
                        Each row is an energy cluster. The line traces which cluster {formatCountryName(selectedCountry)} belonged to each year.
                        A curve means the country moved to a different energy cluster that year.
                    </Text>
                </div>
                <Badge color={transitions === 0 ? 'teal' : transitions <= 2 ? 'orange' : 'red'} variant="light" size="sm">
                    {transitions} transition{transitions !== 1 ? 's' : ''}
                </Badge>
            </Group>

            {/* Legend */}
            <Group gap="xs" mb="sm" wrap="wrap">
                {clusters.map(c => {
                    const color = getClusterColorById(c, clusterNames);
                    return (
                        <Badge key={c} size="xs" variant="light"
                            style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>
                            {clusterNames?.[c] || `C${c}`}
                        </Badge>
                    );
                })}
            </Group>

            <div style={{ overflowX: 'auto' }}>
                <svg
                    width={SVG_W}
                    height={SVG_H}
                    style={{ minWidth: MIN_W, display: 'block' }}
                >
                    {/* Lane backgrounds */}
                    {clusters.map((cid, idx) => {
                        const color = getClusterColorById(cid, clusterNames);
                        const isActive = path.some(d => d.cluster === cid);
                        return (
                            <rect key={cid}
                                x={LABEL_W - 6}
                                y={YEAR_LABEL_H + idx * LANE_H}
                                width={SVG_W - LABEL_W + 6}
                                height={LANE_H}
                                fill={isActive ? color + '12' : color + '06'}
                                stroke={color + '25'}
                                strokeWidth={0.5}
                            />
                        );
                    })}

                    {/* Lane labels */}
                    {clusters.map((cid, idx) => {
                        const color = getClusterColorById(cid, clusterNames);
                        return (
                            <text key={cid}
                                x={LABEL_W - 20}
                                y={YEAR_LABEL_H + idx * LANE_H + LANE_H / 2 + 4}
                                textAnchor="end"
                                fontSize={11}
                                fill={color}
                                fontWeight={700}
                            >
                                {clusterNames?.[cid] || `C${cid}`}
                            </text>
                        );
                    })}

                    {/* Year tick marks */}
                    {years.map((yr, i) => (
                        <text key={yr}
                            x={yearX(i)}
                            y={YEAR_LABEL_H - 6}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#868e96"
                        >{yr}</text>
                    ))}
                    {years.map((yr, i) => (
                        <line key={`tick-${yr}`}
                            x1={yearX(i)} y1={YEAR_LABEL_H - 2}
                            x2={yearX(i)} y2={YEAR_LABEL_H + clusters.length * LANE_H}
                            stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
                        />
                    ))}

                    {/* Connection path */}
                    <path
                        d={svgPathD}
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth={2}
                        fill="none"
                        strokeLinejoin="round"
                    />

                    {/* Coloured segments between dots */}
                    {path.slice(1).map((d, i) => {
                        const prev = path[i];
                        const x1 = yearX(i);
                        const y1 = laneY(prev.cluster);
                        const x2 = yearX(i + 1);
                        const y2 = laneY(d.cluster);
                        const changed = prev.cluster !== d.cluster;
                        const color = getClusterColorById(d.cluster, clusterNames);
                        const midX = (x1 + x2) / 2;
                        const segPath = changed
                            ? `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
                            : `M ${x1} ${y1} L ${x2} ${y2}`;
                        return (
                            <path key={i} d={segPath}
                                stroke={color}
                                strokeWidth={changed ? 2.5 : 2}
                                fill="none"
                                strokeDasharray={changed ? '5 3' : undefined}
                                opacity={0.8}
                            />
                        );
                    })}

                    {/* Cluster dots */}
                    {path.map((d, i) => {
                        const cx = yearX(i);
                        const cy = laneY(d.cluster);
                        const color = getClusterColorById(d.cluster, clusterNames);
                        const changed = i > 0 && d.cluster !== path[i - 1].cluster;
                        return (
                            <g key={d.year}>
                                {changed && (
                                    <circle cx={cx} cy={cy} r={DOT_R + 5}
                                        fill="none" stroke={color} strokeWidth={1.5}
                                        strokeDasharray="3 2" opacity={0.7}
                                    />
                                )}
                                <circle cx={cx} cy={cy} r={DOT_R}
                                    fill={color} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5}
                                />
                                <text x={cx} y={cy + 4}
                                    textAnchor="middle" fontSize={8}
                                    fill="white" fontWeight={700}
                                >
                                    {String(d.year).slice(2)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </Paper>
    );
};

// ─── Main export ─────────────────────────────────────────────────────────────
export const TransitionFlowChart = ({ data, selectedCountry: propSelectedCountry, clusterNames }: TransitionFlowChartProps) => {
    const { selectedCountry: contextSelectedCountry } = useInteraction();
    const activeCountry = propSelectedCountry !== undefined ? propSelectedCountry : contextSelectedCountry;

    return activeCountry
        ? <SwimlaneView data={data} selectedCountry={activeCountry} clusterNames={clusterNames} />
        : <AggregateView data={data} clusterNames={clusterNames} />;
};
