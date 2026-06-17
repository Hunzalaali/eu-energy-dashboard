import { useState, useMemo } from 'react';
import { LoadingOverlay, Slider, Select, SegmentedControl, Title } from '@mantine/core';
import {
    IconLayoutDashboard, IconChartScatter,
    IconTimeline, IconFlask, IconHierarchy,
} from '@tabler/icons-react';
import {
    performStableAnalysis, buildStableCentroids,
    assignClusterNamesZScore,
    getMetricLabel, type ClusteredData,
} from '../services/analysis';
import type { SectoralDataWithTargets } from '../types/energy';
import { useEnergyData } from '../data/useEnergyData';
import { useSectoralData } from '../data/useSectoralData';
import { InteractionProvider, useInteraction } from '../context/InteractionContext';

import MapChart, { ISO_TO_NAME } from './MapChart';
import ClusterRadarChart from './ClusterRadarChart';
import { ClusterScatterPlot } from './ClusterScatterPlot';
import { SectoralEmissionsChart } from './SectoralEmissionsChart';
import { GoalTrackingChart } from './GoalTrackingChart';
import { EnergyMixChart } from './EnergyMixChart';
import { EnergyTrendsChart } from './EnergyTrendsChart';
import { TransitionFlowChart } from './TransitionFlowChart';
import { TypologyRadarChart } from './TypologyRadarChart';
import { TypologyCrossTab } from './TypologyCrossTab';
import { SocioEnergyScatter } from './SocioEnergyScatter';
import { MethodologyView } from './MethodologyView';
import { HeatmapChart } from './HeatmapChart';
import { CountryDetailPanel } from './CountryDetailPanel';
import { DendrogramChart } from './DendrogramChart';
import { ClusterContextProfile } from './ClusterContextProfile';
import { CountryTrajectory } from './CountryTrajectory';
import { ClusterBoxPlot } from './ClusterBoxPlot';

const METRICS: string[] = [
    'renewable_share', 'energy_dependency', 'ghg_intensity',
    'energy_intensity', 'per_capita_toe', 'fossil_share', 'nuclear_share'
];

// Map Explorer removed as separate tab — map is integrated directly into Overview.
// Heatmap tab removed — HeatmapChart consolidated into Cluster Analysis view.
const VIEWS = [
    { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
    { id: 'cluster', label: 'Cluster Analysis', icon: IconChartScatter },
    { id: 'typologies', label: 'Typologies', icon: IconHierarchy },
    { id: 'timeSeries', label: 'Temporal Trajectories', icon: IconTimeline },
    { id: 'methodology', label: 'Methodology', icon: IconFlask },
];

// ──────────────────────────────────────────────────────────────────────────────
const DashboardInner = () => {
    const { data, loading } = useEnergyData();
    const [year, setYear] = useState<number>(2023);
    const [metric, setMetric] = useState<string>('renewable_share');
    const [mapMode, setMapMode] = useState<string>('cluster');
    const [view, setView] = useState<string>('overview');
    const { selectedCountry, setSelectedCountry, compareCountry, setCompareCountry } = useInteraction();

    // ── Stable centroids: computed once from all-years country averages ────────
    const stableCentroids = useMemo<number[][]>(() => {
        if (!data || data.length === 0) return [];
        return buildStableCentroids(data, 4);
    }, [data]);

    // ── All-years data (same stable centroids, UMAP skipped for performance) ─
    const allYearsClusteredData = useMemo<ClusteredData[]>(() => {
        if (!data || data.length === 0 || stableCentroids.length === 0) return [];
        const years = Array.from(new Set(data.map(d => d.year))).sort();
        const results: ClusteredData[] = [];
        const previousAssignments: Record<string, number> = {};

        years.forEach(y => {
            const clustered = performStableAnalysis(data, y, stableCentroids, true, previousAssignments);
            results.push(...clustered);
            clustered.forEach(c => {
                previousAssignments[c.country] = c.cluster;
            });
        });
        return results;
    }, [data, stableCentroids]);

    // ── Per-year analysis using stable centroids ───────────────────────────────
    const analyzedData = useMemo<ClusteredData[]>(() => {
        if (stableCentroids.length === 0) return [];

        // Retrieve previous-year assignments from allYearsClusteredData for consistency
        const prevYear = year - 1;
        const prevAssignments: Record<string, number> = {};
        allYearsClusteredData.forEach(d => {
            if (d.year === prevYear) {
                prevAssignments[d.country] = d.cluster;
            }
        });

        return performStableAnalysis(data || [], year, stableCentroids, false, prevAssignments);
    }, [data, year, stableCentroids, allYearsClusteredData]);

    // ── Stability stats for KPI row ──────────────────────────────────────────
    const stabilityStats = useMemo(() => {
        if (allYearsClusteredData.length === 0) return { total: 0, avgPerYear: '—' };
        const years = Array.from(new Set(allYearsClusteredData.map(d => d.year))).sort() as number[];
        let total = 0;
        for (let i = 1; i < years.length; i++) {
            const prev = allYearsClusteredData.filter(d => d.year === years[i - 1]);
            const curr = allYearsClusteredData.filter(d => d.year === years[i]);
            curr.forEach(c => {
                const p = prev.find(p => p.country === c.country);
                if (p && p.cluster !== c.cluster) total++;
            });
        }
        return { total, avgPerYear: (total / (years.length - 1)).toFixed(1) };
    }, [allYearsClusteredData]);

    // ── Cluster names: derived from ALL years of stable data so names are
    //    consistent regardless of which year the slider is set to. ────────────
    const clusterNames = useMemo(() => {
        if (allYearsClusteredData.length === 0) return {};
        return assignClusterNamesZScore(allYearsClusteredData);
    }, [allYearsClusteredData]);

    // ── Sectoral data ─────────────────────────────────────────────────────────
    const { data: euSectoralData } = useSectoralData(null);
    const { data: sectoralData } = useSectoralData(selectedCountry);
    const { data: compareSectoralData } = useSectoralData(compareCountry);

    const maxYear = useMemo(() => Math.max(...((data || []).map(d => d.year) || [2023])), [data]);
    const minYear = useMemo(() => Math.min(...((data || []).map(d => d.year) || [2010])), [data]);
    const countries = useMemo(() => Array.from(new Set((data || []).map(d => d.country))).sort(), [data]);

    return (
        <div className="dashboard-layout">
            {/* ── Sidebar ─────────────────────────────────────────────────── */}
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
                        min={minYear} max={maxYear} value={year} onChange={setYear}
                        step={1} size="xs" color="indigo"
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
                            data={countries.map(c => ({ value: c, label: `${ISO_TO_NAME[c] || c} (${c})` }))}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            searchable clearable size="xs"
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0' },
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label>Compare With</label>
                        <Select
                            placeholder="Select to compare..."
                            data={countries.filter(c => c !== selectedCountry).map(c => ({ value: c, label: `${ISO_TO_NAME[c] || c} (${c})` }))}
                            value={compareCountry}
                            onChange={setCompareCountry}
                            searchable clearable size="xs"
                            disabled={!selectedCountry}
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0' },
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label>Metric</label>
                        <Select
                            data={METRICS.map(m => ({ value: m, label: getMetricLabel(m) }))}
                            value={metric}
                            onChange={v => setMetric(v || METRICS[0])}
                            size="xs"
                            styles={{
                                input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' },
                                dropdown: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' },
                                option: { color: '#e2e8f0' },
                            }}
                        />
                    </div>
                </div>
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <main className="dashboard-main">
                <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

                {/* ════════════════ OVERVIEW ════════════════ */}
                {view === 'overview' && (
                    <>
                        <div className="page-header">
                            <h1>EU Energy Dashboard</h1>
                            <p>Explore how 27 European countries produce and consume energy and how that has changed from 2010 to {year}</p>
                        </div>

                        <KPIRow data={analyzedData} sectoralData={euSectoralData} year={year} stabilityStats={stabilityStats} />

                        {/* Map Row */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <div className="chart-card-header">
                                <div>
                                    <Title order={4}>Spatial Overview</Title>
                                    <div className="chart-card-subtitle">Click a country to select • Click legend to filter cluster</div>
                                </div>
                                <SegmentedControl
                                    value={mapMode}
                                    onChange={setMapMode}
                                    data={[
                                        { label: '🎨 Clusters', value: 'cluster' },
                                        { label: '📊 Metric', value: 'metric' },
                                    ]}
                                    size="xs"
                                />
                            </div>
                            <MapChart
                                data={analyzedData}
                                metric={metric}
                                mode={mapMode as 'metric' | 'cluster'}
                                clusterNames={clusterNames}
                            />
                        </div>

                        {/* Details Row */}
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                            <div className="chart-card" style={{ flex: compareCountry ? 2.5 : 2.5 }}>
                                <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                            </div>

                            {selectedCountry ? (
                                compareCountry ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 2 }}>
                                        <div style={{ flex: 1 }}>
                                            <CountryDetailPanel data={analyzedData} sectoralData={sectoralData} clusterNames={clusterNames} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <CountryDetailPanel data={analyzedData} sectoralData={compareSectoralData} clusterNames={clusterNames} countryCode={compareCountry} onClose={() => setCompareCountry(null)} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ flex: 2 }}>
                                        <CountryDetailPanel data={analyzedData} sectoralData={sectoralData} clusterNames={clusterNames} />
                                    </div>
                                )
                            ) : (
                                <div className="chart-card" style={{ flex: 2 }}>
                                    <ClusterScatterPlot data={analyzedData} method="umap" clusterNames={clusterNames} />
                                </div>
                            )}
                        </div>

                        {/* Row 2: Cluster Transition Path — full width */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <TransitionFlowChart data={allYearsClusteredData} selectedCountry={selectedCountry} clusterNames={clusterNames} />
                        </div>

                        {!compareCountry ? (
                            <>
                                {/* Row 3: Energy Mix + Sectoral Emissions */}
                                <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                                    <div className="chart-card">
                                        <EnergyMixChart data={data || []} selectedCountry={selectedCountry} />
                                    </div>
                                    <div className="chart-card">
                                        <SectoralEmissionsChart data={sectoralData} selectedCountry={selectedCountry} highlightedSector={null} />
                                    </div>
                                </div>
                                {/* Row 4: Goal Tracking */}
                                <div className="chart-card" style={{ marginBottom: 16 }}>
                                    <GoalTrackingChart data={sectoralData} selectedCountry={selectedCountry} />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Row 3: Energy Mix (Compare) */}
                                <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                                    <div className="chart-card">
                                        <EnergyMixChart data={data || []} selectedCountry={selectedCountry} />
                                    </div>
                                    <div className="chart-card">
                                        <EnergyMixChart data={data || []} selectedCountry={compareCountry} />
                                    </div>
                                </div>
                                {/* Row 4: Sectoral Emissions (Compare) */}
                                <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                                    <div className="chart-card">
                                        <SectoralEmissionsChart data={sectoralData} selectedCountry={selectedCountry} highlightedSector={null} />
                                    </div>
                                    <div className="chart-card">
                                        <SectoralEmissionsChart data={compareSectoralData} selectedCountry={compareCountry} highlightedSector={null} />
                                    </div>
                                </div>
                                {/* Row 5: Goal Tracking (Compare) */}
                                <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                                    <div className="chart-card">
                                        <GoalTrackingChart data={sectoralData} selectedCountry={selectedCountry} />
                                    </div>
                                    <div className="chart-card">
                                        <GoalTrackingChart data={compareSectoralData} selectedCountry={compareCountry} />
                                    </div>
                                </div>
                            </>
                        )}


                    </>
                )}

                {/* ════════════════ CLUSTER ANALYSIS ════════════════ */}
                {view === 'cluster' && (
                    <>
                        <div className="page-header">
                            <h1>Energy Groups</h1>
                            <p>
                                Countries with similar energy profiles are placed into groups. Explore what makes each group unique ({year}).
                            </p>
                        </div>

                        {/* Row 1: Radar + Scatter */}
                        <div className="chart-grid chart-grid-2" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <ClusterRadarChart data={analyzedData} clusterNames={clusterNames} />
                            </div>
                            <div className="chart-card">
                                <ClusterScatterPlot data={analyzedData} method="umap" clusterNames={clusterNames} />
                            </div>
                        </div>

                        {/* Row 2: Box Plot — within-cluster distributions */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <ClusterBoxPlot data={analyzedData} clusterNames={clusterNames} />
                        </div>

                        {/* Row 3: Consolidated Cluster Detail (Heatmap + Composition) */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <HeatmapChart data={analyzedData} clusterNames={clusterNames} />
                        </div>

                        {/* Row 4: Dendrogram (full width) */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <DendrogramChart data={analyzedData} k={4} clusterNames={clusterNames} />
                        </div>

                    </>
                )}

                {/* ════════════════ HEATMAP — removed as separate tab ════════════════ */}

                {/* ════════════════ TYPOLOGIES ════════════════ */}
                {view === 'typologies' && (
                    <>
                        <div className="page-header">
                            <h1>Country Typologies</h1>
                            <p>
                                Structural typologies group countries by stable baseline factors (economic wealth and climate) that change very slowly.
                                Contrast this with dynamic energy clusters to understand how countries with similar structural conditions pursue different transition strategies.
                            </p>
                        </div>

                        {/* Row 1: Radar + Cross-tab */}
                        <div className="chart-grid chart-grid-1-1" style={{ marginBottom: 16 }}>
                            <div className="chart-card">
                                <TypologyRadarChart data={data} year={year} />
                            </div>
                            <div className="chart-card">
                                <TypologyCrossTab
                                    typoData={data || []}
                                    energyData={analyzedData}
                                    energyClusterNames={clusterNames}
                                    year={year}
                                />
                            </div>
                        </div>

                        {/* Row 2: Cluster Context Profile — all 5 secondary variables (thesis §5.7) */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <ClusterContextProfile
                                typoData={data || []}
                                energyData={analyzedData}
                                energyClusterNames={clusterNames}
                                year={year}
                            />
                        </div>

                        {/* Row 3: Socio-energy scatter — full width */}
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

                {/* ════════════════ TEMPORAL TRAJECTORIES ════════════════ */}
                {view === 'timeSeries' && (
                    <>
                        <div className="page-header">
                            <h1>Temporal Trajectories</h1>
                            <p>Track how European countries have transitioned between energy clusters over time, and explore long-term metric trends.</p>
                        </div>
                        {/* Row 2: Trend chart */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <EnergyTrendsChart
                                data={data || []}
                                selectedCountry={selectedCountry}
                                metric={metric}
                                allYearsData={allYearsClusteredData}
                                clusterNames={clusterNames}
                                onYearChange={setYear}
                            />
                        </div>
                        {/* Row 3: Country Temporal Sparklines and Timeline (Only really relevant if a country is selected) */}
                        <div style={{ marginBottom: 16 }}>
                            <CountryTrajectory data={allYearsClusteredData} />
                        </div>

                        {/* Row 1: Transition flow — full width timeline */}
                        <div className="chart-card" style={{ marginBottom: 16 }}>
                            <TransitionFlowChart data={allYearsClusteredData} selectedCountry={selectedCountry} clusterNames={clusterNames} />
                        </div>

                        

                        
                    </>
                )}

                {/* ════════════════ METHODOLOGY ════════════════ */}
                {view === 'methodology' && (
                    <>
                        <MethodologyView data={data} year={year} allYearsData={allYearsClusteredData} />
                    </>
                )}
            </main>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
const KPIRow = ({ data, sectoralData, year, stabilityStats }: {
    data: ClusteredData[];
    sectoralData: SectoralDataWithTargets[];
    year: number;
    stabilityStats: { total: number; avgPerYear: string };
}) => {
    const latestSectoral = sectoralData.find(d => d.year === year);
    const avgRenewable = data.length > 0
        ? data.reduce((acc, d) => acc + (Number(d.renewable_share) || 0), 0) / data.length : 0;
    const numClusters = new Set(data.map(d => d.cluster)).size;

    return (
        <div className="kpi-row">
            <div className="kpi-card">
                <div className="kpi-label">Countries Analyzed</div>
                <div className="kpi-value neutral" title="Number of EU Member States included in this year's data">{data.length}</div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Avg. Renewable Share</div>
                <div className="kpi-value positive" title="What percentage of energy comes from renewables (solar, wind, hydro) on average across all EU countries">{avgRenewable.toFixed(1)}%</div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Emissions vs. Year 1990</div>
                <div className={`kpi-value ${(latestSectoral?.emissionsVs1990 ?? 0) < 0 ? 'positive' : 'negative'}`}
                    title="How much CO₂ emissions have changed compared to the year 1990. Negative = good progress.">
                    {latestSectoral?.emissionsVs1990 !== undefined ? `${latestSectoral.emissionsVs1990.toFixed(1)}%` : '—'}
                </div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Energy Groups ({year})</div>
                <div className="kpi-value neutral" title="How many distinct energy groups (clusters) exist this year based on countries' energy profiles">{numClusters}</div>
            </div>
            <div className="kpi-card">
                <div className="kpi-label">Group Changes (2010–2023)</div>
                <div className={`kpi-value ${stabilityStats.total <= 20 ? 'positive' : 'negative'}`}
                    title={`Total number of times a country moved to a different energy group across all years. Fewer changes = more stable long-term strategies. Average: ${stabilityStats.avgPerYear} per year.`}>
                    {stabilityStats.total} <span style={{ fontSize: '0.55em', opacity: 0.7 }}>({stabilityStats.avgPerYear}/yr)</span>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
export const Dashboard = () => (
    <InteractionProvider>
        <DashboardInner />
    </InteractionProvider>
);
