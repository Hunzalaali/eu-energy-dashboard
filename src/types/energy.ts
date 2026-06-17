/**
 * Canonical type definitions for the EU Energy Dashboard.
 *
 * All components and services should import types from this module
 * to avoid duplicate/conflicting interface definitions.
 */

// ---------------------------------------------------------------------------
// Core Energy Data
// ---------------------------------------------------------------------------

/**
 * Raw energy data row as loaded from the CSV.
 *
 * Each row represents one country in one year with energy metrics
 * and optional socioeconomic context variables.
 */
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

/**
 * Energy data enriched with cluster assignment and
 * dimensionality-reduction coordinates.
 *
 * Produced by `performStableAnalysis()` or `performAnalysis()`.
 */
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

/**
 * Real sectoral GHG emissions data from Eurostat / EEA.
 *
 * Data source: Eurostat dataset env_air_gge (Greenhouse gas emissions by source sector)
 * Reference: European Environment Agency, "Trends and projections in Europe 2024"
 *
 * Sectors follow CRF (Common Reporting Format) mapping:
 *   - power:       CRF 1.A.1 — Fuel combustion in energy industries
 *   - industry:    CRF 1.A.2 — Fuel combustion in manufacturing & construction
 *   - transport:   CRF 1.A.3 — Fuel combustion in transport
 *   - buildings:   CRF 1.A.4 — Fuel combustion in residential & commercial sectors
 *   - agriculture: CRF 3     — Agriculture (enteric fermentation, manure, soils)
 *
 * Units: Million tonnes CO₂-equivalent (MtCO₂eq)
 */
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

/**
 * Processed sectoral data with computed policy targets.
 *
 * Targets are derived from the EU's Fit for 55 package:
 *   - 2030 target: −55% vs 1990 baseline (European Climate Law, Regulation 2021/1119)
 *   - 2050 target: Net-zero with ~10% residual (European Green Deal)
 */
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
