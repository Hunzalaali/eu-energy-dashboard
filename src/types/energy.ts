export interface EnergyData {
    country: string;
    year: number;
    iso_alpha?: string;

    // ── Primary energy indicators (7-dimensional clustering profile) ──
    renewable_share: number;
    energy_dependency: number;
    ghg_intensity: number;
    energy_intensity: number;
    fossil_share: number;
    nuclear_share: number;

    // ── Secondary energy indicators ──
    per_capita_toe?: number;
    renewable_share_elec?: number;

    // ── Socioeconomic context variables (from contextual CSV) ──
    gdp_pps?: number;
    mfg_share?: number;
    urb_rate?: number;
    hdd?: number;
    pop_density?: number;

    // ── Typology cluster assignment (computed in useEnergyData) ──
    cluster?: number;
    clusterName?: string;

    // Index signature for dynamic feature access
    [key: string]: string | number | undefined;
}

// ---------------------------------------------------------------------------
// Clustered Data (after analysis)
// ---------------------------------------------------------------------------

export interface ClusteredData extends EnergyData {
    cluster: number;
    clusterTimeSeries?: number;
    tsneX?: number;
    tsneY?: number;
    umapX?: number;
    umapY?: number;
}

// ---------------------------------------------------------------------------
// Cluster Centroid
// ---------------------------------------------------------------------------

export interface ClusterCentroid {
    cluster: number;
    [key: string]: number;
}

// ---------------------------------------------------------------------------
// Sectoral Emissions
// ---------------------------------------------------------------------------

export interface SectoralEmissions {
    country: string;
    year: number;
    power: number;
    industry: number;
    transport: number;
    buildings: number;
    agriculture: number;
    total: number;
}
export interface SectoralDataWithTargets extends SectoralEmissions {
    target2030: number;
    target2050: number;
    emissionsVs1990: number;  // Percentage change vs 1990 baseline
}

// ---------------------------------------------------------------------------
// Algorithm Comparison (Methodology)
// ---------------------------------------------------------------------------

export interface AlgorithmComparison {
    algorithm: string;
    k: number;
    silhouette: number;
    dbi: number;
    ch: number;
    noisePoints?: number;
    assignments: number[];
    labels: string[];
}

// ---------------------------------------------------------------------------
// Box Plot Statistics
// ---------------------------------------------------------------------------

export interface BoxPlotStat {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}
