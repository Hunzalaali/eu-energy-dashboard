import { useState, useMemo } from 'react';
import { AppShell, Container, Title, LoadingOverlay, Paper, Box, Grid, SegmentedControl, Text } from '@mantine/core';
import { performAnalysis, performTimeSeriesAnalysis, assignClusterNames, getClusterCentroids, normalizeForRadar, type ClusteredData } from '../services/analysis';
import type { EnergyData } from '../data/useEnergyData';
import { useEnergyData } from '../data/useEnergyData';
import MapChart from './MapChart';
import ClusterRadarChart from './ClusterRadarChart';
import { SidebarControls } from './SidebarControls';
import { ClusterScatterPlot } from './ClusterScatterPlot';
import { ClusterCompositionList } from './ClusterCompositionList';
import { KPICards } from './KPICards';
import { EnergyTrendsChart } from './EnergyTrendsChart';
import { TransitionFlowChart } from './TransitionFlowChart';
import { MethodologyView } from './MethodologyView';
import { ClusterBoxPlot } from './ClusterBoxPlot';
import { TypologyRadarChart } from './TypologyRadarChart';
import { TypologyTimeSeriesChart } from './TypologyTimeSeriesChart';

const METRICS: string[] = [
    'renewable_share', 'energy_dependency', 'ghg_intensity',
    'energy_intensity', 'fossil_share', 'nuclear_share'
];

export const Dashboard = () => {
    const { data, loading } = useEnergyData();
    const [year, setYear] = useState<number>(2023);
    const [metric, setMetric] = useState<string>('renewable_share');
    const [mapMode, setMapMode] = useState<string>('metric');

    const [view, setView] = useState<string>('map');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const timeSeriesClusters = useMemo(() => {
        if (!data || data.length === 0) return new Map();
        return performTimeSeriesAnalysis(data as any, 4); // Need to typecast strictly later if needed
    }, [data]);

    const fullClusteredData = useMemo(() => {
        return (data || []).map(d => ({
            ...d,
            cluster: d.cluster || 0, // Fallback if no cluster
            clusterTimeSeries: timeSeriesClusters.get(d.country)
        })) as ClusteredData[];
    }, [data, timeSeriesClusters]);

    const analyzedData = useMemo<ClusteredData[]>(() => {
        const yearlyData = performAnalysis((data || []) as any, year);
        return yearlyData.map((d: any) => ({
            ...d,
            clusterTimeSeries: timeSeriesClusters.get(d.country)
        }));
    }, [data, year, timeSeriesClusters]);

    const clusterNames = useMemo(() => {
        if (analyzedData.length === 0) return {};
        const centroids = getClusterCentroids(analyzedData);
        // Normalize for fair naming based on relative strength
        const normalized = normalizeForRadar(analyzedData, centroids);
        return assignClusterNames(normalized);
    }, [analyzedData]);

    const maxYear = useMemo(() => Math.max(...((data || []).map(d => d.year) || [2023])), [data]);
    const minYear = useMemo(() => Math.min(...((data || []).map(d => d.year) || [2010])), [data]);
    const countries = useMemo(() => Array.from(new Set((data || []).map(d => d.country))).sort(), [data]);

    const handleCountryClick = (geo: any) => {
        const countryName = geo.properties.name;
        setSelectedCountry(countryName);
    };

    return (
        <AppShell
            navbar={{ width: 300, breakpoint: 'sm' }}
            padding="md"
        >
            {/* ... Navbar ... */}
            <AppShell.Navbar p="md">
                <Title order={4} mb="md">EU Energy Dashboard</Title>
                <SidebarControls
                    year={year}
                    setYear={setYear}
                    minYear={minYear}
                    maxYear={maxYear}
                    metrics={METRICS}
                    metric={metric}
                    setMetric={setMetric}
                    selectedCountry={selectedCountry}
                    setSelectedCountry={setSelectedCountry}
                    countries={countries}
                    currentView={view}
                    setView={setView}
                />
            </AppShell.Navbar>

            <AppShell.Main>
                <Container fluid h="100%">
                    <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

                    {view === 'map' && (
                        <Box>
                            <Box mb="md">
                                <KPICards data={analyzedData} />
                            </Box>
                            <Box mb="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Title order={3}>Spatial EDA: Map View</Title>
                                <SegmentedControl
                                    value={mapMode}
                                    onChange={setMapMode}
                                    data={[
                                        { label: 'Metric Value', value: 'metric' },
                                        { label: 'Clusters', value: 'cluster' },
                                    ]}
                                />
                            </Box>
                            <Paper shadow="sm" p="md" withBorder>
                                <MapChart
                                    data={analyzedData}
                                    metric={metric as string}
                                    mode={mapMode as 'metric' | 'cluster'}
                                    onCountryClick={handleCountryClick}
                                    selectedCluster={null}
                                    selectedCountry={selectedCountry}
                                />
                            </Paper>
                        </Box>
                    )}

                    {view === 'cluster' && (
                        <Box>
                            <Title order={3} mb="md">Cluster Analysis</Title>
                            <Grid>
                                <Grid.Col span={8}>
                                    <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <ClusterScatterPlot data={analyzedData} method="umap" />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <ClusterCompositionList data={analyzedData} />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <ClusterBoxPlot data={analyzedData} clusterNames={clusterNames} />
                                </Grid.Col>
                            </Grid>
                        </Box>
                    )}

                    {view === 'timeSeries' && (
                        <Box>
                            <Title order={3} mb="md">Temporal Evolution</Title>
                            <Grid>
                                <Grid.Col span={12}>
                                    <EnergyTrendsChart
                                        data={data || []} // Use raw data for full time series
                                        selectedCountry={selectedCountry}
                                        metric={metric as string}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <TransitionFlowChart
                                        data={fullClusteredData}
                                        selectedCountry={selectedCountry}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Box>
                    )}

                    {view === 'typologies' && (
                        <Box>
                            <Title order={3} mb="xs">Country Typologies</Title>
                            <Text c="dimmed" mb="md" size="sm">
                                Multivariate K-Means clustering (using Wealth, Industry, Urbanization, HDD, and Density) to categorize EU-27 states.
                            </Text>
                            <Grid>
                                <Grid.Col span={6}>
                                    <Paper shadow="sm" p="md" withBorder>
                                        <Title order={5} mb="sm" ta="center">Structural Typology Profile</Title>
                                        <Text c="dimmed" size="xs" ta="center" mb="md">Average scaled contextual metrics (2023)</Text>
                                        <TypologyRadarChart data={data} />
                                    </Paper>
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Paper shadow="sm" p="md" withBorder>
                                        <Title order={5} mb="sm" ta="center">Decarbonization Trajectory by Typology</Title>
                                        <Text c="dimmed" size="xs" ta="center" mb="md">Performance grouped by underlying structural cluster</Text>
                                        <TypologyTimeSeriesChart data={data} metricKey={metric as keyof EnergyData} />
                                    </Paper>
                                </Grid.Col>
                            </Grid>
                        </Box>
                    )}

                    {view === 'methodology' && (
                        <Box>
                            <Title order={3} mb="md">Methodology & Validation</Title>
                            <MethodologyView data={data} year={year} />
                        </Box>
                    )}

                </Container>
            </AppShell.Main>
        </AppShell>
    );
};
