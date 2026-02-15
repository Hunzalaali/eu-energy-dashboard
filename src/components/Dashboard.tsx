import { useState, useEffect, useMemo } from 'react';
import { AppShell, Container, Title, Group, LoadingOverlay, Tabs, Select, Slider, Text, SegmentedControl, Stack } from '@mantine/core';
import { IconMap, /* IconChartLine, */ IconChartDots } from '@tabler/icons-react';
import { loadData, performAnalysis, type EnergyData, type ClusteredData, getMetricLabel } from '../services/analysis';
import MapChart from './MapChart';
import ClusterAnalysis from './ClusterAnalysis';
import { EnergyTrendsChart } from './EnergyTrendsChart';
// import { KPICards } from './KPICards';

const METRICS = [
    'renewable_share', 'energy_dependency', 'ghg_intensity',
    'energy_intensity', 'fossil_share', 'nuclear_share'
];

export const Dashboard = () => {
    const [data, setData] = useState<EnergyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState<number>(2023); // Default to latest
    const [metric, setMetric] = useState<string>('renewable_share');
    const [activeTab, setActiveTab] = useState<string | null>('map');
    const [mapMode, setMapMode] = useState<string>('metric');

    useEffect(() => {
        loadData().then(d => {
            setData(d);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    // Perform analysis (Clustering + PCA) whenever data or year changes
    const analyzedData = useMemo<ClusteredData[]>(() => {
        return performAnalysis(data, year);
    }, [data, year]);

    const maxYear = useMemo(() => Math.max(...(data.map(d => d.year) || [2023])), [data]);
    const minYear = useMemo(() => Math.min(...(data.map(d => d.year) || [2010])), [data]);

    return (
        <AppShell header={{ height: 90 }} padding="sm">
            <AppShell.Header p="sm">
                <Group justify="space-between">
                    <Title order={3}>EU Energy Transition Patterns</Title>
                    <Group>
                        <Select
                            label="Metric"
                            placeholder="Select Metric"
                            data={METRICS.map(m => ({ value: m, label: getMetricLabel(m) }))}
                            value={metric}
                            onChange={(v) => setMetric(v || 'renewable_share')}
                            w={250}
                            disabled={activeTab === 'map' && mapMode === 'cluster'}
                        />
                        <Stack gap={0} w={200}>
                            <Text size="sm" fw={500}>Year: {year}</Text>
                            <Slider
                                min={minYear}
                                max={maxYear}
                                value={year}
                                onChange={setYear}
                                step={1}
                                label={(value) => value}
                            />
                        </Stack>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="xl">
                    <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

                    {/* <KPICards data={analyzedData} /> */}

                    <Tabs value={activeTab} onChange={setActiveTab} mt="lg" variant="outline" radius="md">
                        <Tabs.List>
                            <Tabs.Tab value="map" leftSection={<IconMap size={14} />}>Map View</Tabs.Tab>
                            {/* <Tabs.Tab value="trends" leftSection={<IconChartLine size={14} />}>Time Series</Tabs.Tab> */}
                            <Tabs.Tab value="clusters" leftSection={<IconChartDots size={14} />}>Cluster Analysis</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="map" pt="md">
                            <Group mb="md" justify="center">
                                <SegmentedControl
                                    value={mapMode}
                                    onChange={setMapMode}
                                    data={[
                                        { label: 'Metric Value', value: 'metric' },
                                        { label: 'Cluster Membership', value: 'cluster' },
                                    ]}
                                />
                            </Group>
                            <MapChart data={analyzedData} metric={metric} mode={mapMode as 'metric' | 'cluster'} />
                        </Tabs.Panel>

                        <Tabs.Panel value="trends" pt="md">
                            <EnergyTrendsChart
                                data={data} // Pass raw data for time series
                                title={`Time Series Analysis: ${getMetricLabel(metric)}`}
                            />
                        </Tabs.Panel>

                        <Tabs.Panel value="clusters" pt="md">
                            <ClusterAnalysis data={analyzedData} />
                        </Tabs.Panel>
                    </Tabs>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
};
