import { useMemo } from 'react';
import { Paper, Title, Grid, Text, Table, Badge, Group, Divider } from '@mantine/core';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { calculateClusterMetrics, compareAlgorithms, assignClusterNamesZScore, type EnergyData, type AlgorithmComparison, type ClusteredData } from '../services/analysis';
import { getClusterColorById } from '../utils/clusterColors';

interface MethodologyViewProps {
    data: EnergyData[];
    year: number;
    allYearsData?: ClusteredData[];
}

type AlgorithmComparisonWithNames = AlgorithmComparison & {
    ephemeralNames?: Record<number, string>;
};

const alignClusterIdsByMajority = (source: number[], target: number[]): Record<number, number> => {
    const votes: Record<number, Record<number, number>> = {};

    source.forEach((sourceClusterId, idx) => {
        const targetClusterId = target[idx];
        if (sourceClusterId < 0 || targetClusterId < 0) return;

        votes[sourceClusterId] ??= {};
        votes[sourceClusterId][targetClusterId] = (votes[sourceClusterId][targetClusterId] ?? 0) + 1;
    });

    const mapping: Record<number, number> = {};
    Object.entries(votes).forEach(([sourceClusterId, targetVotes]) => {
        const winner = Object.entries(targetVotes).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return Number(a[0]) - Number(b[0]);
        })[0];
        if (winner) mapping[Number(sourceClusterId)] = Number(winner[0]);
    });

    return mapping;
};

export const MethodologyView = ({ data, year }: MethodologyViewProps) => {
    // We must use cross-sectional (single-year) data to compute validation metrics. 
    // Averaging 14 years of transition data mathematically pulls all countries toward the global mean, 
    // destroying the variance separation required by Silhouette, DBI, and CH metrics.
    const metrics = useMemo(() => {
        return calculateClusterMetrics(data, year, [2, 3, 4, 5, 6, 7, 8]);
    }, [data, year]);

    const comparison = useMemo(() => {
        return compareAlgorithms(data, year, 4);
    }, [data, year]);

    const countryByName = useMemo(() => {
        return new Map(data.map(row => [row.country, row]));
    }, [data]);

    // Find the best algorithm for each metric
    const bestAlgo = useMemo(() => {
        if (comparison.length === 0) return {};
        const validComparisons = comparison.filter(c => c.k > 1);
        if (validComparisons.length === 0) return {};
        return {
            silhouette: validComparisons.reduce((best, c) => c.silhouette > best.silhouette ? c : best, validComparisons[0])?.algorithm,
            dbi: validComparisons.reduce((best, c) => c.dbi < best.dbi && c.dbi > 0 ? c : best, validComparisons[0])?.algorithm,
            ch: validComparisons.reduce((best, c) => c.ch > best.ch ? c : best, validComparisons[0])?.algorithm,
        };
    }, [comparison]);

    // Dynamically assign semantic names to the on-the-fly clusters based on their actual mathematical centroids
    const mappedComparison = useMemo<AlgorithmComparisonWithNames[]>(() => {
        if (comparison.length === 0) return [];

        return comparison.map(algo => {
            // Build ClusteredData for this specific algorithm run
            const algoData: ClusteredData[] = algo.labels
                .map((country, idx) => {
                    const countryData = countryByName.get(country);
                    if (!countryData) return null;
                    return {
                        ...countryData,
                        cluster: algo.assignments[idx]
                    } as ClusteredData;
                })
                .filter((row): row is ClusteredData => row !== null);

            // Evaluate the true semantic name for these ephemeral clusters
            const ephemeralNames = algoData.length > 0 ? assignClusterNamesZScore(algoData) : {};

            return {
                ...algo,
                ephemeralNames
            };
        });
    }, [comparison, countryByName]);

    const kMeansVsHierAgreementByCountry = useMemo<Record<string, boolean>>(() => {
        const kMeans = mappedComparison.find(algo => algo.algorithm.toLowerCase().includes('k-means'));
        const hierarchical = mappedComparison.find(algo => algo.algorithm.toLowerCase().includes('hierarchical'));
        if (!kMeans || !hierarchical) return {};
        if (kMeans.labels.length !== hierarchical.labels.length) return {};

        const hierarchicalToKMeans = alignClusterIdsByMajority(hierarchical.assignments, kMeans.assignments);
        const alignedHierByCountry = new Map<string, number>();

        hierarchical.labels.forEach((country, idx) => {
            const raw = hierarchical.assignments[idx];
            const aligned = raw >= 0 && hierarchicalToKMeans[raw] !== undefined
                ? hierarchicalToKMeans[raw]
                : raw;
            alignedHierByCountry.set(country, aligned);
        });

        const result: Record<string, boolean> = {};
        kMeans.labels.forEach((country, idx) => {
            const hierCluster = alignedHierByCountry.get(country);
            result[country] = hierCluster !== undefined && kMeans.assignments[idx] === hierCluster;
        });

        return result;
    }, [mappedComparison]);

    return (
        <Grid>

            {/* Title Section */}
            <Grid.Col span={12}>
                <Title order={2} mb="xs">Methodology Validation</Title>
                <Text size="sm" c="dimmed" mb="md">
                    Cross sectional evaluation of clustering algorithms for EU-27 energy profiles ({year}). 
                    Metrics are calculated on single year data to preserve variance separation, validating the K=4 parameter before applying it to the global transition model.
                </Text>
            </Grid.Col>

            {/* Algorithm Comparison Table */}
            <Grid.Col span={12}>
                <Paper shadow="xs" p="md" withBorder>
                    <Title order={4} mb="xs">Algorithm Comparison</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Three clustering algorithms evaluated on the 14 year averaged EU-27 energy indicators.
                        Best value per metric highlighted in green. DBSCAN discovers K automatically.
                    </Text>
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Algorithm</Table.Th>
                                <Table.Th>K (clusters)</Table.Th>
                                <Table.Th>Silhouette ↑</Table.Th>
                                <Table.Th>DBI ↓</Table.Th>
                                <Table.Th>CH Index ↑</Table.Th>
                                <Table.Th>Noise Points</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {comparison.map((algo) => (
                                <Table.Tr key={algo.algorithm}>
                                    <Table.Td fw={600}>{algo.algorithm}</Table.Td>
                                    <Table.Td>{algo.k}</Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            {algo.silhouette.toFixed(3)}
                                            {bestAlgo.silhouette === algo.algorithm && <Badge size="xs" color="green">Best</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            {algo.dbi.toFixed(3)}
                                            {bestAlgo.dbi === algo.algorithm && <Badge size="xs" color="green">Best</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            {algo.ch.toFixed(1)}
                                            {bestAlgo.ch === algo.algorithm && <Badge size="xs" color="green">Best</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        {algo.noisePoints !== undefined ? (
                                            algo.noisePoints > 0 ? (
                                                <Badge color="orange" size="sm">{algo.noisePoints} outliers</Badge>
                                            ) : '0'
                                        ) : '—'}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                    <Text size="xs" c="dimmed" mt="sm">
                        <strong>Silhouette</strong> (Rousseeuw, 1987): Higher is better [-1, 1]. |
                        <strong> DBI</strong> (Davies & Bouldin, 1979): Lower is better. |
                        <strong> CH</strong> (Calinski & Harabasz, 1974): Higher is better.
                    </Text>
                </Paper>
            </Grid.Col>

            {/* Cluster Membership Comparison */}
            <Grid.Col span={12}>
                <Paper shadow="xs" p="md" withBorder>
                    <Title order={4} mb="xs">Cluster Membership Comparison</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Algorithm assignments across countries. Disagreements highlight borderline cases.
                    </Text>
                    {mappedComparison.length > 0 && (
                        <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Country</Table.Th>
                                    {mappedComparison.map(algo => (
                                        <Table.Th key={algo.algorithm}>{algo.algorithm}</Table.Th>
                                    ))}
                                    <Table.Th>Agreement</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {mappedComparison[0]?.labels.map((country, idx) => {
                                    const assignments = mappedComparison.map(algo => algo.assignments[idx]);
                                    const agree = kMeansVsHierAgreementByCountry[country];
                                    return (
                                        <Table.Tr key={country} bg={agree === false ? 'rgba(255, 146, 43, 0.1)' : undefined}>
                                            <Table.Td fw={600}>{country}</Table.Td>
                                            {assignments.map((a, i) => {
                                                const algo = mappedComparison[i];
                                                const label = a === -1 ? 'Noise' : (algo.ephemeralNames?.[a] || `C${a}`);
                                                // We want the color to match the semantic string exactly
                                                const color = a === -1 ? '#868e96' : getClusterColorById(a, algo.ephemeralNames);
                                                
                                                return (
                                                    <Table.Td key={i}>
                                                        <Badge
                                                            size="xs"
                                                            variant="light"
                                                            style={{
                                                                backgroundColor: color + '22',
                                                                color: color,
                                                                border: `1px solid ${color}44`,
                                                                textTransform: 'none'
                                                            }}
                                                        >
                                                            {label}
                                                        </Badge>
                                                    </Table.Td>
                                                );
                                            })}
                                            <Table.Td>
                                                {agree === undefined ? (
                                                    <Badge size="xs" color="gray" variant="light">N/A</Badge>
                                                ) : agree ? (
                                                    <Badge size="xs" color="green" variant="light">✓ Agree</Badge>
                                                ) : (
                                                    <Badge size="xs" color="orange" variant="light">Divergent</Badge>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>
            </Grid.Col>

            <Grid.Col span={12}>
                <Divider label="K-Means Parameter Selection" labelPosition="center" my="md" />
            </Grid.Col>

            {/* Elbow Method */}
            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={420}>
                    <Title order={4} mb="xs">Elbow Method (Inertia / WCSS)</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Within-Cluster Sum of Squares. The "elbow" at K=4 indicates diminishing returns from additional clusters.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" label={{ value: 'Number of clusters (K)', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Inertia (WCSS)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="inertia" stroke="#845ef7" strokeWidth={2} dot={{ r: 4 }} />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" label={{ value: 'K=4', fill: 'red', position: 'top' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

            {/* Silhouette */}
            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={420}>
                    <Title order={4} mb="xs">Silhouette Analysis</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Measures cluster cohesion vs. separation (Rousseeuw, 1987). Score range: [-1, 1]. Higher = better separation.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" label={{ value: 'Number of clusters (K)', position: 'insideBottom', offset: -5 }} />
                            <YAxis domain={[-0.2, 0.8]} />
                            <Tooltip />
                            <Bar dataKey="silhouette" fill="#20c997" />
                            <ReferenceLine y={0} stroke="#000" />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

            {/* Davies-Bouldin Index */}
            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={420}>
                    <Title order={4} mb="xs">Davies-Bouldin Index</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Average cluster similarity ratio (Davies & Bouldin, 1979). Lower values indicate better separated clusters.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" label={{ value: 'Number of clusters (K)', position: 'insideBottom', offset: -5 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="dbi" stroke="#e8590c" strokeWidth={2} dot={{ r: 4 }} name="DBI" />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

            {/* Calinski-Harabasz Index */}
            <Grid.Col span={6}>
                <Paper shadow="xs" p="md" withBorder h={420}>
                    <Title order={4} mb="xs">Calinski-Harabasz Index</Title>
                    <Text size="xs" c="dimmed" mb="md">
                        Variance ratio criterion (Calinski & Harabasz, 1974). Higher values indicate better defined, well separated clusters.
                    </Text>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" label={{ value: 'Number of clusters (K)', position: 'insideBottom', offset: -5 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="ch" fill="#4dabf7" name="CH Index" />
                            <ReferenceLine x={4} stroke="red" strokeDasharray="3 3" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid.Col>

        </Grid>
    );
};
