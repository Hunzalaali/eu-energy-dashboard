import { useState, useMemo } from 'react';
import { LoadingOverlay, Slider, Select, SegmentedControl } from '@mantine/core';
import {
    IconLayoutDashboard, IconMap, IconChartScatter,
    IconTimeline, IconFlask, IconHierarchy, IconGridDots,
} from '@tabler/icons-react';
import { performAnalysis, performTimeSeriesAnalysis, assignClusterNames, getClusterCentroids, normalizeForRadar, getMetricLabel, type ClusteredData } from '../services/analysis';
import type { EnergyData } from '../data/useEnergyData';
import { useEnergyData } from '../data/useEnergyData';
import { useSectoralData } from '../data/useSectoralData';
import { InteractionProvider, useInteraction } from '../context/InteractionContext';

import MapChart from './MapChart';
import ClusterRadarChart from './ClusterRadarChart';
import { ClusterScatterPlot } from './ClusterScatterPlot';
import { ClusterCompositionList } from './ClusterCompositionList';
import { ClusterBoxPlot } from './ClusterBoxPlot';
import { SectoralEmissionsChart } from './SectoralEmissionsChart';
import { GoalTrackingChart } from './GoalTrackingChart';
import { EnergyMixChart } from './EnergyMixChart';
import { EnergyTrendsChart } from './EnergyTrendsChart';
import { TransitionFlowChart } from './TransitionFlowChart';
import { TypologyRadarChart } from './TypologyRadarChart';
import { TypologyTimeSeriesChart } from './TypologyTimeSeriesChart';
import { TypologyCrossTab } from './TypologyCrossTab';
import { SocioEnergyScatter } from './SocioEnergyScatter';
import { MethodologyView } from './MethodologyView';
import { HeatmapChart } from './HeatmapChart';
import { CountryDetailPanel } from './CountryDetailPanel';
import { DendrogramChart } from './DendrogramChart';
import { PCABiplot } from './PCABiplot';

const METRICS: string[] = [
    'renewable_share', 'energy_dependency', 'ghg_intensity',
    'energy_intensity', 'fossil_share', 'nuclear_share'
];

const VIEWS = [
    { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
    { id: 'map', label: 'Map Explorer', icon: IconMap },
    { id: 'cluster', label: 'Cluster Analysis', icon: IconChartScatter },
    { id: 'heatmap', label: 'Heatmap', icon: IconGridDots },
    { id: 'typologies', label: 'Typologies', icon: IconHierarchy },
    { id: 'timeSeries', label: 'Time Series', icon: IconTimeline },
    { id: 'methodology', label: 'Methodology', icon: IconFlask },
];

// Inner component that reads the interaction context
const DashboardInner = () => {
    const { data, loading } = useEnergyData();
    const [year, setYear] = useState<number>(2023);
    const [metric, setMetric] = useState<string>('renewable_share');
    const [mapMode, setMapMode] = useState<string>('cluster');
    const [view, setView] = useState<string>('overview');

    const { selectedCountry, setSelectedCountry, compareCountry, setCompareCountry } = useInteraction();

    const timeSeriesClusters = useMemo(() => {
        if (!data || data.length === 0) return new Map();
        return performTimeSeriesAnalysis(data as any, 4);
    }, [data]);


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
        const normalized = normalizeForRadar(analyzedData, centroids);
        return assignClusterNames(normalized);
    }, [analyzedData]);

    // Per-year clustered data for Cluster Distribution Over Time & Transition Path
    // We run performAnalysis for every unique year so the transition chart reflects
    // genuine year-by-year energy cluster shifts, not a fixed typology assignment.
    const allYearsClusteredData = useMemo<ClusteredData[]>(() => {
        if (!data || data.length === 0) return [];
        const years = Array.from(new Set((data as any[]).map((d: any) => d.year))).sort() as number[];
        return years.flatMap(y => {
            const yearResult = performAnalysis((data || []) as any, y);
            return yearResult.map((d: any) => ({
                ...d,
                clusterTimeSeries: timeSeriesClusters.get(d.country),
            }));
        });
    }, [data, timeSeriesClusters]);

    const { data: sectoralData } = useSectoralData(selectedCountry);
    const { data: compareSectoralData } = useSectoralData(compareCountry);

    const maxYear = useMemo(() => Math.max(...((data || []).map(d => d.year) || [2023])), [data]);
    const minYear = useMemo(() => Math.min(...((data || []).map(d => d.year) || [2010])), [data]);
    const countries = useMemo(() => Array.from(new Set((data || []).map(d => d.country))).sort(), [data]);

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="logo">🇪🇺 EU Energy Dashboard</div>
                <div className="logo-sub">Visual Analytics of Energy Transition</div>

                <div className="nav-section">Views</div>
                {VIEWS.map(v => (
                    <div
                        key={v.id}
                        className={`nav-item ${view === v.id ? 'active' : ''}`}
                        onClick={() => setView(v.id)}
                    >
                        <v.icon size={16} stroke={1.8} />
                        {v.label}
                    </div>
                ))}

                <div className="sidebar-controls">
                    <label>Year: {year}</label>
                    <Slider
                        min={minYear}
                        max={maxYear}
                        value={year}
                        onChange={setYear}
                        step={1}
                        size="xs"
                        color="indigo"
                        marks={[
                            { value: minYear, label: String(minYear) },
                            { value: maxYear, label: String(maxYear) },
                        ]}
                        styles={{ markLabel: { color: '#64748b', fontSize: 10 } }}
                    />

                    <div style={{ marginTop: 16 }}>
                        <label>Country</label>
                        <Select
                            placeholder="All Countries"
                            data={countries}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            searchable
                            clearable
                            size="xs"
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0', '&[dataComboboxSelected]': { background: 'rgba(99,102,241,0.2)' } },
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label>Compare With</label>
                        <Select
                            placeholder="Select to compare..."
                            data={countries.filter(c => c !== selectedCountry)}
                            value={compareCountry}
                            onChange={setCompareCountry}
                            searchable
                            clearable
                            size="xs"
                            disabled={!selectedCountry}
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0', '&[dataComboboxSelected]': { background: 'rgba(239,68,68,0.2)' } },
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label>Metric</label>
                        <Select
                            data={METRICS.map(m => ({ value: m, label: getMetricLabel(m) }))}
                            value={metric}
                            onChange={(v) => setMetric(v || METRICS[0])}
                            size="xs"
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0', '&[dataComboboxSelected]': { background: 'rgba(99,102,241,0.2)' } },
                            }}
                        />
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard-main">
                <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

                {/* ============= OVERVIEW ============= */}
                {view === 'overview' && (
                    <>
                        <div className="page-header">
                            <h1>Overview Dashboard</h1>
                            <p>EU-27 Energy Analytics — Coordinated Multiple Views ({year})</p>
                        </div>

                        {/* KPI Row */}
                        <KPIRow data={analyzedData} sectoralData={sectoralData} year={year} />

                        {/* Main coordinated row: Map + Right Panel */}
                        <div className="chart-grid chart-grid-2-1" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <div className="chart-card-header">
                                    <div>
                                        <div className="chart-card-title">Spatial Clusters</div>
                                        <div className="chart-card-subtitle">Click a country to select • Click legend to filter cluster</div>
                                    </div>
                                </div>
                                <MapChart
                                    data={analyzedData}
                                    metric={metric}
                                    mode="cluster"
                                    clusterNames={clusterNames}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="chart-card" style={{ flex: '0 0 auto' }}>
                                    <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                                </div>

                                {selectedCountry ? (
                                    compareCountry ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                                            <CountryDetailPanel data={analyzedData} sectoralData={sectoralData} clusterNames={clusterNames} />
                                            <CountryDetailPanel data={analyzedData} sectoralData={compareSectoralData} clusterNames={clusterNames} countryCode={compareCountry} onClose={() => setCompareCountry(null)} />
                                        </div>
                                    ) : (
                                        <CountryDetailPanel
                                            data={analyzedData}
                                            sectoralData={sectoralData}
                                            clusterNames={clusterNames}
                                        />
                                    )
                                ) : (
                                    <div className="chart-card" style={{ flex: 1 }}>
                                        <ClusterScatterPlot data={analyzedData} method="umap" clusterNames={clusterNames} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Emissions pathway */}
                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <SectoralEmissionsChart data={sectoralData} selectedCountry={selectedCountry} highlightedSector={null} />
                            </div>
                            {compareCountry ? (
                                <div className="chart-card">
                                    <SectoralEmissionsChart data={compareSectoralData} selectedCountry={compareCountry} highlightedSector={null} />
                                </div>
                            ) : (
                                <div className="chart-card">
                                    <GoalTrackingChart data={sectoralData} selectedCountry={selectedCountry} />
                                </div>
                            )}
                        </div>

                        {/* Row 2.5: Goal Tracking (if comparing) */}
                        {compareCountry && (
                            <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                                <div className="chart-card">
                                    <GoalTrackingChart data={sectoralData} selectedCountry={selectedCountry} />
                                </div>
                                <div className="chart-card">
                                    <GoalTrackingChart data={compareSectoralData} selectedCountry={compareCountry} />
                                </div>
                            </div>
                        )}

                        {/* Row 3: Energy mix */}
                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <EnergyMixChart data={data || []} selectedCountry={selectedCountry} />
                            </div>
                            {compareCountry ? (
                                <div className="chart-card">
                                    <EnergyMixChart data={data || []} selectedCountry={compareCountry} />
                                </div>
                            ) : (
                                <div className="chart-card">
                                    <EnergyMixChart data={data || []} selectedCountry={null} />
                                </div>
                            )}
                        </div>

                        {/* Row 4: Cluster Transition Path — always full width so the swimlane has room */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <TransitionFlowChart data={allYearsClusteredData} selectedCountry={selectedCountry} clusterNames={clusterNames} />
                        </div>
                    </>
                )}

                {/* ============= MAP EXPLORER ============= */}
                {view === 'map' && (
                    <>
                        <div className="page-header">
                            <h1>Map Explorer</h1>
                            <p>Spatial distribution of EU-27 energy indicators — hover to compare, click to select</p>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <SegmentedControl
                                value={mapMode}
                                onChange={setMapMode}
                                data={[
                                    { label: '📊 Metric Value', value: 'metric' },
                                    { label: '🎨 Clusters', value: 'cluster' },
                                ]}
                                size="xs"
                            />
                        </div>

                        <div className="chart-grid chart-grid-3-1">
                            <div className="chart-card">
                                <MapChart
                                    data={analyzedData}
                                    metric={metric}
                                    mode={mapMode as 'metric' | 'cluster'}
                                    clusterNames={clusterNames}
                                />
                            </div>
                            <div>
                                {compareCountry && selectedCountry ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                                        <CountryDetailPanel data={analyzedData} sectoralData={sectoralData} clusterNames={clusterNames} />
                                        <CountryDetailPanel data={analyzedData} sectoralData={compareSectoralData} clusterNames={clusterNames} countryCode={compareCountry} onClose={() => setCompareCountry(null)} />
                                    </div>
                                ) : (
                                    <CountryDetailPanel
                                        data={analyzedData}
                                        sectoralData={sectoralData}
                                        clusterNames={clusterNames}
                                    />
                                )}
                                <div className="chart-card" style={{ marginTop: 12 }}>
                                    <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ============= CLUSTER ANALYSIS ============= */}
                {view === 'cluster' && (
                    <>
                        <div className="page-header">
                            <h1>Cluster Analysis</h1>
                            <p>Energy profile typologies via K-Means clustering with UMAP projection ({year})</p>
                        </div>

                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                            </div>
                            <div className="chart-card">
                                <ClusterScatterPlot data={analyzedData} method="umap" clusterNames={clusterNames} />
                            </div>
                        </div>

                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <DendrogramChart data={analyzedData} k={4} />
                            </div>
                            <div className="chart-card">
                                <PCABiplot data={analyzedData} />
                            </div>
                        </div>

                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <ClusterCompositionList data={analyzedData} clusterNames={clusterNames} />
                        </div>

                        <div className="chart-card">
                            <ClusterBoxPlot data={analyzedData} clusterNames={clusterNames} />
                        </div>
                    </>
                )}

                {/* ============= HEATMAP ============= */}
                {view === 'heatmap' && (
                    <>
                        <div className="page-header">
                            <h1>Country × Indicator Heatmap</h1>
                            <p>Z-score normalized energy indicators — rows ordered by cluster assignment. Hover to highlight across all views.</p>
                        </div>

                        <div className="chart-grid chart-grid-2-1" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <HeatmapChart data={analyzedData} />
                            </div>
                            <div>
                                {compareCountry && selectedCountry ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                                        <CountryDetailPanel data={analyzedData} sectoralData={sectoralData} clusterNames={clusterNames} />
                                        <CountryDetailPanel data={analyzedData} sectoralData={compareSectoralData} clusterNames={clusterNames} countryCode={compareCountry} onClose={() => setCompareCountry(null)} />
                                    </div>
                                ) : (
                                    <CountryDetailPanel
                                        data={analyzedData}
                                        sectoralData={sectoralData}
                                        clusterNames={clusterNames}
                                    />
                                )}
                                <div className="chart-card" style={{ marginTop: 12 }}>
                                    <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ============= TYPOLOGIES ============= */}
                {view === 'typologies' && (
                    <>
                        <div className="page-header">
                            <h1>Country Typologies</h1>
                            <p>
                                Structural K-Means on 5 socioeconomic dimensions — and how those typologies
                                map onto energy clusters for <strong>{year}</strong>
                            </p>
                        </div>

                        {/* Row 1: Structural profiles */}
                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <TypologyRadarChart data={data} year={year} />
                            </div>
                            <div className="chart-card">
                                <TypologyTimeSeriesChart data={data} metricKey={metric as keyof EnergyData} year={year} />
                            </div>
                        </div>

                        {/* Row 2: Cross-tab — typology × energy cluster */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <TypologyCrossTab
                                typoData={data || []}
                                energyData={analyzedData}
                                energyClusterNames={clusterNames}
                                year={year}
                            />
                        </div>

                        {/* Row 3: Socioeconomic factor vs energy outcome scatter */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <SocioEnergyScatter
                                typoData={data || []}
                                energyData={analyzedData}
                                energyClusterNames={clusterNames}
                                year={year}
                            />
                        </div>
                    </>
                )}

                {/* ============= TIME SERIES ============= */}
                {view === 'timeSeries' && (
                    <>
                        <div className="page-header">
                            <h1>Temporal Evolution</h1>
                            <p>Energy indicator trends and cluster transition dynamics (2010-2023)</p>
                        </div>

                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <EnergyTrendsChart data={data || []} selectedCountry={selectedCountry} metric={metric} />
                        </div>

                        <div className="chart-card">
                            <TransitionFlowChart data={allYearsClusteredData} selectedCountry={selectedCountry} clusterNames={clusterNames} />
                        </div>
                    </>
                )}

                {/* ============= METHODOLOGY ============= */}
                {view === 'methodology' && (
                    <>
                        <div className="page-header">
                            <h1>Methodology & Validation</h1>
                            <p>Systematic evaluation of clustering algorithms, parameter selection, and validation metrics</p>
                        </div>
                        <MethodologyView data={data} year={year} />
                    </>
                )}
            </main>
        </div>
    );
};

// KPI Row component using real data
const KPIRow = ({ data, sectoralData, year }: { data: ClusteredData[]; sectoralData: any[]; year: number }) => {
    const latestSectoral = sectoralData.find(d => d.year === year);
    const avgRenewable = data.length > 0
        ? data.reduce((acc, d) => acc + (Number(d.renewable_share) || 0), 0) / data.length : 0;
    const numClusters = new Set(data.map(d => d.cluster)).size;

    return (
        <div className="kpi-row">
            <div className="kpi-card">
                <div className="kpi-label">Countries Analyzed</div>
                <div className="kpi-value neutral">{data.length}</div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Avg Renewable Share</div>
                <div className="kpi-value positive">{avgRenewable.toFixed(1)}%</div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Emissions vs 2000</div>
                <div className={`kpi-value ${latestSectoral?.emissionsVs2000 < 0 ? 'positive' : 'negative'}`}>
                    {latestSectoral ? `${latestSectoral.emissionsVs2000.toFixed(1)}%` : '—'}
                </div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Clusters ({year})</div>
                <div className="kpi-value neutral">{numClusters}</div>
            </div>
        </div>
    );
};

// Wrapper with InteractionProvider
export const Dashboard = () => {
    return (
        <InteractionProvider>
            <DashboardInner />
        </InteractionProvider>
    );
};
