
import { kmeans } from 'ml-kmeans';
import { UMAP } from 'umap-js';

// Canonical types — single source of truth
export type { EnergyData, ClusteredData, ClusterCentroid, AlgorithmComparison, BoxPlotStat } from '../types/energy';
import type { EnergyData, ClusteredData, ClusterCentroid, AlgorithmComparison, BoxPlotStat } from '../types/energy';

export const FEATURES = [
    'renewable_share',
    'energy_dependency',
    'ghg_intensity',
    'energy_intensity',
    'per_capita_toe',
    'fossil_share',
    'nuclear_share',
];

// Dead code removed: loadData(), performAnalysis() — replaced by
// useEnergyData hook and performStableAnalysis() respectively.

// ClusterCentroid type now imported from types/energy.ts

export const getClusterCentroids = (data: ClusteredData[]): ClusterCentroid[] => {
    const clusters = Array.from(new Set(data.map(d => d.cluster))).sort();

    return clusters.map(clusterId => {
        const clusterPoints = data.filter(d => d.cluster === clusterId);
        const centroid: ClusterCentroid = { cluster: clusterId };

        // Calculate mean for each feature (unscaled for readability in Radar, or scaled?)
        // Usually Radar charts are better with normalized data (0-1) or Z-scores, 
        // but for interpretation, raw values are often better -- HOWEVER, they have vastly different scales.
        // Let's normalize to 0-1 range based on the GLOBAL min/max of that year.

        FEATURES.forEach(feature => {
            const sum = clusterPoints.reduce((acc, curr) => acc + (Number(curr[feature]) || 0), 0);
            centroid[feature] = sum / clusterPoints.length;
        });

        return centroid;
    });
};

export const normalizeForRadar = (data: ClusteredData[], centroids: ClusterCentroid[]): ClusterCentroid[] => {
    // We need to normalize the centroids to 0-1 relative to the dataset's min/max for the radar chart to look good.
    const normalizedCentroids: ClusterCentroid[] = centroids.map(c => ({ ...c })); // Deep copy-ish

    FEATURES.forEach(feature => {
        const values = data.map(d => Number(d[feature]) || 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        normalizedCentroids.forEach(c => {
            c[feature] = (c[feature] - min) / range;
        });
    });

    return normalizedCentroids;
};

export const getMetricLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
        'renewable_share': 'Overall Renewable Share (%)',
        'energy_dependency': 'Net Import Dependency (%)',
        'ghg_intensity': 'GHG Emissions Intensity (tCO2e/capita)',
        'energy_intensity': 'Energy Intensity of GDP (toe/M€)',
        'per_capita_toe': 'Energy Consumption (toe/capita)',
        'fossil_share': 'Fossil Fuel Share in Electricity (%)',
        'nuclear_share': 'Nuclear Share in Electricity (%)',
        'renewable_share_elec': 'Renewable Share in Electricity (%)'
    };
    return labels[key] || key;
}

export const reclusterData = (data: ClusteredData[], features: string[], k: number): ClusteredData[] => {
    if (data.length < k) return data;

    const dataset = data.map(d =>
        features.map(f => Number(d[f]) || 0)
    );

    try {
        const result = kmeans(dataset, k, { initialization: 'kmeans++', seed: 42 });

        return data.map((d, i) => ({
            ...d,
            cluster: result.clusters[i]
        }));
    } catch (e) {
        console.error("Reclustering failed", e);
        return data;
    }
};

// Dead code removed: performTimeSeriesAnalysis() — unused, superseded by
// buildStableCentroids + performStableAnalysis.

// ---------------------------------------------------------------------------
// STABLE CLUSTERING
// ---------------------------------------------------------------------------

/**
 * Build stable cluster centroids from the full time-series dataset.
 *
 * Instead of clustering each year independently (which leads to label
 * instability due to random K-Means initialisation), we cluster one
 * *average* feature vector per country computed across all available years.
 * The resulting centroids are fixed and reused for every year.
 *
 * Returns centroids sorted ascending by renewable_share so that cluster 0
 * is always the least-renewable group and cluster k-1 is always the most.
 */
export const buildStableCentroids = (data: EnergyData[], k: number = 4): number[][] => {
    const countries = Array.from(new Set(data.map(d => d.country)));

    // One average feature vector per country across all years
    const countryVectors: number[][] = [];
    countries.forEach(country => {
        const rows = data.filter(d => d.country === country);
        if (rows.length === 0) return;
        const vector = FEATURES.map(f => {
            const vals = rows.map(d => (typeof d[f] === 'number' ? (d[f] as number) : 0));
            return vals.reduce((a, b) => a + b, 0) / vals.length;
        });
        countryVectors.push(vector);
    });

    if (countryVectors.length < k) return [];

    // Global standardisation (all years, all countries)
    const allDataset = data.map(d => FEATURES.map(f => (typeof d[f] === 'number' ? (d[f] as number) : 0)));
    const gMeans = FEATURES.map((_, i) => allDataset.reduce((a, r) => a + r[i], 0) / allDataset.length);
    const gStds = FEATURES.map((_, i) => {
        const m = gMeans[i];
        return Math.sqrt(allDataset.reduce((a, r) => a + Math.pow(r[i] - m, 2), 0) / allDataset.length) || 1;
    });

    const scaled = countryVectors.map(v => v.map((val, i) => (val - gMeans[i]) / gStds[i]));

    // Consensus K-Means — 20 restarts, keep best inertia
    const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + Math.pow(v - b[i], 2), 0));
    let bestCentroids: number[][] = [];
    let bestInertia = Infinity;

    for (let run = 0; run < 20; run++) {
        const res = kmeans(scaled, k, { initialization: 'kmeans++', seed: 42 + run });
        let inertia = 0;
        res.clusters.forEach((ci, i) => { inertia += Math.pow(dist(scaled[i], res.centroids[ci]), 2); });
        if (inertia < bestInertia) { bestInertia = inertia; bestCentroids = res.centroids; }
    }

    // Sort by renewable_share ascending → deterministic label ordering
    const ri = FEATURES.indexOf('renewable_share');
    return [...bestCentroids].sort((a, b) => (a[ri] ?? 0) - (b[ri] ?? 0));
};

/**
 * Perform stable energy-cluster analysis for a single year.
 *
 * Uses pre-built stable centroids (from buildStableCentroids) so that
 * cluster identities are consistent across years — a country only changes
 * cluster when its actual energy profile drifts, not due to random seed
 * differences.
 */
const getCountryRollingFeatures = (
    data: EnergyData[],
    country: string,
    targetYear: number,
    windowSize: number = 3
): Record<string, number> => {
    const years = Array.from({ length: windowSize }, (_, i) => targetYear - i);
    const countryData = data.filter(d => d.country === country && years.includes(d.year));
    
    const rolled: Record<string, number> = {};
    FEATURES.forEach(f => {
        if (countryData.length === 0) {
            rolled[f] = 0;
            return;
        }
        const sum = countryData.reduce((acc, d) => acc + (typeof d[f] === 'number' ? (d[f] as number) : 0), 0);
        rolled[f] = sum / countryData.length;
    });
    return rolled;
};

export const performStableAnalysis = (
    data: EnergyData[],
    year: number,
    stableCentroids: number[][],
    /** Set true when you only need cluster assignments (skips UMAP — much faster) */
    skipUMAP: boolean = false,
    previousAssignments?: Record<string, number>
): ClusteredData[] => {
    const yearData = data.filter(d => d.year === year);
    if (yearData.length === 0 || stableCentroids.length === 0) return [];

    // Same global standardisation as buildStableCentroids
    const allDataset = data.map(d => FEATURES.map(f => (typeof d[f] === 'number' ? (d[f] as number) : 0)));
    const gMeans = FEATURES.map((_, i) => allDataset.reduce((a, r) => a + r[i], 0) / allDataset.length);
    const gStds = FEATURES.map((_, i) => {
        const m = gMeans[i];
        return Math.sqrt(allDataset.reduce((a, r) => a + Math.pow(r[i] - m, 2), 0) / allDataset.length) || 1;
    });

    const scaledYear = yearData.map(d => {
        const rolled = getCountryRollingFeatures(data, d.country, year, 1);
        return FEATURES.map((f, i) => (rolled[f] - gMeans[i]) / gStds[i]);
    });

    // Assign to nearest stable centroid (with hysteresis)
    const dist = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + Math.pow(v - b[i], 2), 0));
    
    // Compute inter-centroid distance for hysteresis threshold
    let avgInterCentroidDist = 1.0;
    if (stableCentroids.length > 1) {
        let sumDist = 0, count = 0;
        for (let i = 0; i < stableCentroids.length; i++) {
            for (let j = i + 1; j < stableCentroids.length; j++) {
                sumDist += dist(stableCentroids[i], stableCentroids[j]);
                count++;
            }
        }
        avgInterCentroidDist = sumDist / count;
    }
    const hysteresisMargin = 0.05 * avgInterCentroidDist;

    const clusters = scaledYear.map((pt, i) => {
        const countryName = yearData[i].country;
        let bestC = 0, bestD = Infinity;
        stableCentroids.forEach((c, idx) => {
            const d = dist(pt, c);
            if (d < bestD) {
                bestD = d;
                bestC = idx;
            }
        });

        // Apply hysteresis
        if (previousAssignments && previousAssignments[countryName] !== undefined) {
            const prevC = previousAssignments[countryName];
            const distToPrev = dist(pt, stableCentroids[prevC]);
            if (prevC !== bestC && (distToPrev - bestD) < hysteresisMargin) {
                return prevC;
            }
        }
        return bestC;
    });

    // UMAP for scatter-plot visualisation only — skip when not needed (e.g. all-years stability chart)
    let umapResults: number[][] = scaledYear.map(() => [0, 0]);
    if (!skipUMAP) {
        try {
            // Deterministic PRNG to ensure UMAP layout is stable across renders
            let seed = 42;
            const seededRandom = () => {
                const x = Math.sin(seed++) * 10000;
                return x - Math.floor(x);
            };
            
            const umap = new UMAP({ 
                nComponents: 2, 
                nEpochs: 400, 
                nNeighbors: Math.min(15, scaledYear.length - 1),
                random: seededRandom
            });
            umapResults = umap.fit(scaledYear);
        } catch (e) { console.error('UMAP failed', e); }
    }

    return yearData.map((d, i) => ({
        ...d,
        cluster: clusters[i],
        umapX: umapResults[i]?.[0] ?? 0,
        umapY: umapResults[i]?.[1] ?? 0,
        tsneX: 0,
        tsneY: 0,
    }));
};

// --- Methodology Helpers ---

const euclideanDistance = (a: number[], b: number[]) => {
    return Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0));
}

/**
 * Davies-Bouldin Index (DBI)
 * 
 * Measures the average "similarity" between each cluster and its most similar cluster.
 * Lower values indicate better clustering (well-separated, compact clusters).
 * 
 * Reference: Davies, D.L. & Bouldin, D.W. (1979). "A Cluster Separation Measure."
 * IEEE Transactions on Pattern Analysis and Machine Intelligence, PAMI-1(2), 224-227.
 */
const calculateDBI = (data: number[][], clusters: number[], k: number): number => {
    // Compute centroids
    const centroids: number[][] = [];
    const clusterSizes: number[] = new Array(k).fill(0);
    const dim = data[0].length;

    for (let c = 0; c < k; c++) {
        centroids.push(new Array(dim).fill(0));
    }
    data.forEach((point, i) => {
        const c = clusters[i];
        if (c >= 0 && c < k) {
            clusterSizes[c]++;
            for (let d = 0; d < dim; d++) centroids[c][d] += point[d];
        }
    });
    for (let c = 0; c < k; c++) {
        if (clusterSizes[c] > 0) {
            for (let d = 0; d < dim; d++) centroids[c][d] /= clusterSizes[c];
        }
    }

    // Compute scatter (average distance to centroid) for each cluster
    const scatter: number[] = new Array(k).fill(0);
    data.forEach((point, i) => {
        const c = clusters[i];
        if (c >= 0 && c < k) {
            scatter[c] += euclideanDistance(point, centroids[c]);
        }
    });
    for (let c = 0; c < k; c++) {
        scatter[c] = clusterSizes[c] > 0 ? scatter[c] / clusterSizes[c] : 0;
    }

    // Compute DBI
    let dbi = 0;
    for (let i = 0; i < k; i++) {
        let maxRatio = 0;
        for (let j = 0; j < k; j++) {
            if (i === j) continue;
            const ratio = (scatter[i] + scatter[j]) / (euclideanDistance(centroids[i], centroids[j]) || 1e-10);
            if (ratio > maxRatio) maxRatio = ratio;
        }
        dbi += maxRatio;
    }
    return dbi / k;
};

/**
 * Calinski-Harabasz Index (CH Index / Variance Ratio Criterion)
 * 
 * Ratio of between-cluster dispersion to within-cluster dispersion.
 * Higher values indicate better-defined clusters.
 * 
 * Reference: Calinski, T. & Harabasz, J. (1974). "A dendrite method for cluster analysis."
 * Communications in Statistics, 3(1), 1-27.
 */
const calculateCH = (data: number[][], clusters: number[], k: number): number => {
    const n = data.length;
    const dim = data[0].length;
    if (k <= 1 || n <= k) return 0;

    // Global centroid
    const globalCentroid = new Array(dim).fill(0);
    data.forEach(point => {
        for (let d = 0; d < dim; d++) globalCentroid[d] += point[d];
    });
    for (let d = 0; d < dim; d++) globalCentroid[d] /= n;

    // Cluster centroids
    const centroids: number[][] = [];
    const sizes: number[] = new Array(k).fill(0);
    for (let c = 0; c < k; c++) centroids.push(new Array(dim).fill(0));
    data.forEach((point, i) => {
        const c = clusters[i];
        if (c >= 0 && c < k) {
            sizes[c]++;
            for (let d = 0; d < dim; d++) centroids[c][d] += point[d];
        }
    });
    for (let c = 0; c < k; c++) {
        if (sizes[c] > 0) {
            for (let d = 0; d < dim; d++) centroids[c][d] /= sizes[c];
        }
    }

    // Between-cluster dispersion (BG)
    let bg = 0;
    for (let c = 0; c < k; c++) {
        bg += sizes[c] * Math.pow(euclideanDistance(centroids[c], globalCentroid), 2);
    }

    // Within-cluster dispersion (WG)
    let wg = 0;
    data.forEach((point, i) => {
        const c = clusters[i];
        if (c >= 0 && c < k) {
            wg += Math.pow(euclideanDistance(point, centroids[c]), 2);
        }
    });

    return (bg / (k - 1)) / (wg / (n - k));
};

/**
 * Silhouette score computation (reusable).
 */
const calculateSilhouette = (data: number[][], clusters: number[], k: number): number => {
    if (k <= 1) return 0;

    const silhouettes = data.map((point, i) => {
        const ownCluster = clusters[i];

        // a(i): Mean distance to other points in same cluster
        const sameClusterPoints = data.filter((_, idx) => clusters[idx] === ownCluster);
        const a = sameClusterPoints.length > 1
            ? sameClusterPoints.reduce((acc, p) => acc + euclideanDistance(point, p), 0) / (sameClusterPoints.length - 1)
            : 0;

        // b(i): Mean distance to points in nearest neighboring cluster
        let minMeanDist = Infinity;
        for (let c = 0; c < k; c++) {
            if (c === ownCluster) continue;
            const otherClusterPoints = data.filter((_, idx) => clusters[idx] === c);
            if (otherClusterPoints.length > 0) {
                const dist = otherClusterPoints.reduce((acc, p) => acc + euclideanDistance(point, p), 0) / otherClusterPoints.length;
                if (dist < minMeanDist) minMeanDist = dist;
            }
        }
        const b = minMeanDist === Infinity ? 0 : minMeanDist;

        return Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
    });

    return silhouettes.reduce((acc, val) => acc + val, 0) / silhouettes.length;
};

export const calculateClusterMetrics = (data: EnergyData[], year: number, kRange: number[] = [2, 3, 4, 5, 6, 7, 8]) => {
    // If year === 0, bypass the year filter (used for longitudinal average validation)
    const yearData = year === 0 ? data : data.filter((d) => d.year === year);
    if (yearData.length < Math.max(...kRange)) return [];

    // Extract and scale data
    const dataset = yearData.map((d) =>
        FEATURES.map((f) => (typeof d[f] === 'number' ? d[f] : 0))
    ) as number[][];

    const means = FEATURES.map((_, i) =>
        dataset.reduce((acc, row) => acc + row[i], 0) / dataset.length
    );
    const stds = FEATURES.map((_, i) => {
        const mean = means[i];
        const variance = dataset.reduce((acc, row) => acc + Math.pow(row[i] - mean, 2), 0) / dataset.length;
        return Math.sqrt(variance) || 1;
    });
    const scaledData = dataset.map(row =>
        row.map((val, i) => (val - means[i]) / stds[i])
    );

    return kRange.map(k => {
        const result = kmeans(scaledData, k, { initialization: 'kmeans++', seed: 42 });

        // Inertia (WCSS)
        let inertia = 0;
        result.clusters.forEach((clusterIdx, i) => {
            const centroid = result.centroids[clusterIdx];
            inertia += Math.pow(euclideanDistance(scaledData[i], centroid), 2);
        });

        // Silhouette
        const silhouette = calculateSilhouette(scaledData, result.clusters, k);

        // Davies-Bouldin Index
        const dbi = k > 1 ? calculateDBI(scaledData, result.clusters, k) : 0;

        // Calinski-Harabasz Index
        const ch = calculateCH(scaledData, result.clusters, k);

        return { k, inertia, silhouette, dbi, ch };
    });
};


/**
 * Z-score based cluster naming.
 * 
 * Instead of hardcoded thresholds, this computes the z-score of each
 * feature's centroid relative to the overall mean. Features with |z| > 1.0
 * are considered "distinctive" for that cluster.
 * 
 * This is more principled and generalizable than the previous approach.
 */
/**
 * Z-score based cluster naming — energy-mix features prioritised.
 *
 * The naming deliberately weights energy-mix features (renewable_share,
 * fossil_share, nuclear_share, ghg_intensity) more heavily than the
 * supply-chain feature (energy_dependency). per_capita_toe is excluded
 * from naming entirely (weight = 0) because it measures consumption
 * volume rather than transition strategy — a country can have low
 * per-capita consumption due to economic size or climate, not because
 * of any deliberate energy policy.
 *
 * Reference: inspired by Kaufman & Rousseeuw (1990) cluster characterisation.
 */
export const assignClusterNamesZScore = (data: ClusteredData[]): Record<number, string> => {
    const clusters = Array.from(new Set(data.map(d => d.cluster))).sort();
    const names: Record<number, string> = {};

    // Compute global means and stds for each feature
    const globalMeans: Record<string, number> = {};
    const globalStds: Record<string, number> = {};

    FEATURES.forEach(f => {
        const values = data.map(d => Number(d[f]) || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
        globalMeans[f] = mean;
        globalStds[f] = Math.sqrt(variance) || 1;
    });

    // Naming is driven exclusively by energy SOURCE composition (renewable,
    // fossil, nuclear) with ghg_intensity as a secondary emissions signal.
    // All other features are zeroed out:
    //   - energy_intensity: economic efficiency metric, not source composition
    //   - per_capita_toe: consumption volume, not transition strategy
    //   - energy_dependency: supply-chain metric (where energy comes from, not what kind)
    const featureWeight: Record<string, number> = {
        'renewable_share':   1.0,   // primary — energy source
        'fossil_share':      1.0,   // primary — energy source
        'nuclear_share':     1.0,   // primary — energy source
        'ghg_intensity':     0.8,   // secondary — emissions outcome
        'energy_intensity':  0.0,   // EXCLUDED — economic metric, see professor feedback
        'per_capita_toe':    0.0,   // EXCLUDED — consumption volume
        'energy_dependency': 0.0,   // EXCLUDED — supply-chain metric
    };

    const featureDescriptors: Record<string, { high: string; midHigh?: string; low: string }> = {
        'renewable_share':   { high: 'Green Leaders',      midHigh: 'Moderate Renewables', low: 'Low-Renewable'  },
        'energy_dependency': { high: 'High Import Dependency', low: 'Energy Self-Sufficient' },
        'ghg_intensity':     { high: 'Carbon Intensive',   low: 'Low-Carbon'     },
        'energy_intensity':  { high: 'Energy Intensive',   low: 'Efficient'      },
        'per_capita_toe':    { high: 'High Consumption',   low: 'Low Consumption'},
        'fossil_share':      { high: 'Fossil Reliant',     low: 'Post-Fossil'    },
        'nuclear_share':     { high: 'Nuclear Powered',    low: ''               },
    };

    clusters.forEach(clusterId => {
        const clusterPoints = data.filter(d => d.cluster === clusterId);
        if (clusterPoints.length === 0) { names[clusterId] = 'Mixed Profile'; return; }

        // Compute weighted z-scores for this cluster's centroid
        const zScores = FEATURES.map(f => {
            const clusterMean = clusterPoints.reduce((a, d) => a + (Number(d[f]) || 0), 0) / clusterPoints.length;
            const z = (clusterMean - globalMeans[f]) / globalStds[f];
            return { feature: f, z, weighted: Math.abs(z) * (featureWeight[f] ?? 1.0) };
        });

        // Sort by weighted score — energy-mix features win ties over supply-chain features,
        // and energy_dependency is explicitly forced to never be the primary feature.
        // Features with weight 0 (per_capita_toe) are automatically excluded since their
        // weighted score is always 0.
        const sorted = zScores
            .filter(z => Math.abs(z.z) > 0.5 && (featureWeight[z.feature] ?? 1.0) > 0)
            .sort((a, b) => {
                if (a.feature === 'energy_dependency' && b.feature !== 'energy_dependency') return 1;
                if (b.feature === 'energy_dependency' && a.feature !== 'energy_dependency') return -1;
                return b.weighted - a.weighted;
            });

        // Fallback: when no feature has a strong enough z-score, use the cluster's
        // renewable_share relative to the EU average to assign a policy-relevant name.
        if (sorted.length === 0) {
            const clusterRenewableMean = clusterPoints.reduce(
                (a, d) => a + (Number(d['renewable_share']) || 0), 0
            ) / clusterPoints.length;
            names[clusterId] = clusterRenewableMean > globalMeans['renewable_share']
                ? 'Moderate Renewables'
                : 'Diversified Mix';
            return;
        }

        // If the only distinctive feature is energy_dependency, lead with a fallback energy mix feature
        if (sorted.length === 1 && sorted[0].feature === 'energy_dependency') {
            const nextBest = zScores
                .filter(z => z.feature !== 'energy_dependency')
                .sort((a, b) => b.weighted - a.weighted)[0];
            
            let leadLabel = 'Mixed Profile';
            if (nextBest && featureDescriptors[nextBest.feature]) {
                const desc = featureDescriptors[nextBest.feature];
                if (nextBest.z > 1.0) leadLabel = desc.high;
                else if (nextBest.z > 0 && desc.midHigh) leadLabel = desc.midHigh;
                else if (nextBest.z > 0) leadLabel = desc.high;
                else leadLabel = desc.low;
            }
            
            const depLabel = sorted[0].z > 0 ? 'High Import Dependency' : 'Energy Self-Sufficient';
            names[clusterId] = `${leadLabel || 'Mixed Profile'} (${depLabel})`;
            return;
        }

        // Build name from top 1–2 distinctive features
        const parts: string[] = [];
        for (let i = 0; i < Math.min(2, sorted.length); i++) {
            const { feature, z } = sorted[i];
            const desc = featureDescriptors[feature];
            if (desc) {
                let label = '';
                if (z > 1.0) label = desc.high;
                else if (z > 0 && desc.midHigh) label = desc.midHigh;
                else if (z > 0) label = desc.high;
                else label = desc.low;

                if (label) parts.push(label); // only push if not empty string
            }
        }

        // If parts is empty (e.g. only distinctive feature was low nuclear, which has no label),
        // apply the same policy-relevant fallback as when sorted.length === 0.
        if (parts.length === 0) {
            const clusterRenewableMean = clusterPoints.reduce(
                (a, d) => a + (Number(d['renewable_share']) || 0), 0
            ) / clusterPoints.length;
            names[clusterId] = clusterRenewableMean > globalMeans['renewable_share']
                ? 'Moderate Renewables'
                : 'Diversified Mix';
        } else {
            names[clusterId] = parts.join(' & ');
        }
    });

    return names;
};

// Dead code removed: assignClusterNames() — heuristic-based, superseded by
// assignClusterNamesZScore() which uses weighted z-scores for principled naming.


/**
 * Comparative Algorithm Analysis
 * 
 * Runs K-Means, Hierarchical (Ward's), and DBSCAN on the same data,
 * then computes validation metrics for each. This is the core of the
 * methodology comparison needed for the thesis.
 */
import { hierarchicalClustering } from './hierarchicalClustering';
import { dbscan } from './dbscan';

// AlgorithmComparison type now imported from types/energy.ts

export const compareAlgorithms = (data: EnergyData[], year: number, k: number = 4): AlgorithmComparison[] => {
    // If year === 0, bypass the year filter (used for longitudinal average validation)
    const yearData = year === 0 ? data : data.filter(d => d.year === year);
    if (yearData.length === 0) return [];

    const labels = yearData.map(d => d.country);

    // Extract and standardize features
    const dataset = yearData.map((d) =>
        FEATURES.map((f) => (typeof d[f] === 'number' ? d[f] : 0))
    ) as number[][];

    const means = FEATURES.map((_, i) =>
        dataset.reduce((acc, row) => acc + row[i], 0) / dataset.length
    );
    const stds = FEATURES.map((_, i) => {
        const mean = means[i];
        const variance = dataset.reduce((acc, row) => acc + Math.pow(row[i] - mean, 2), 0) / dataset.length;
        return Math.sqrt(variance) || 1;
    });
    const scaledData = dataset.map(row =>
        row.map((val, i) => (val - means[i]) / stds[i])
    );

    const results: AlgorithmComparison[] = [];

    // 1. K-Means (with consensus — run 20 times, pick best by inertia)
    let bestKMeans = { clusters: [] as number[], inertia: Infinity, centroids: [] as number[][] };
    for (let run = 0; run < 20; run++) {
        const result = kmeans(scaledData, k, { initialization: 'kmeans++', seed: 42 + run });
        let inertia = 0;
        result.clusters.forEach((ci, i) => {
            inertia += Math.pow(euclideanDistance(scaledData[i], result.centroids[ci]), 2);
        });
        if (inertia < bestKMeans.inertia) {
            bestKMeans = { clusters: result.clusters, inertia, centroids: result.centroids };
        }
    }

    results.push({
        algorithm: 'K-Means (consensus, n=20)',
        k,
        silhouette: calculateSilhouette(scaledData, bestKMeans.clusters, k),
        dbi: calculateDBI(scaledData, bestKMeans.clusters, k),
        ch: calculateCH(scaledData, bestKMeans.clusters, k),
        assignments: bestKMeans.clusters,
        labels,
    });

    // 2. Hierarchical Clustering (Ward's method)
    const hierResult = hierarchicalClustering(scaledData, labels, k);
    const hierK = Math.max(...hierResult.assignments) + 1;

    results.push({
        algorithm: "Hierarchical (Ward's)",
        k: hierK,
        silhouette: calculateSilhouette(scaledData, hierResult.assignments, hierK),
        dbi: calculateDBI(scaledData, hierResult.assignments, hierK),
        ch: calculateCH(scaledData, hierResult.assignments, hierK),
        assignments: hierResult.assignments,
        labels,
    });

    // 3. DBSCAN
    const dbResult = dbscan(scaledData);
    const dbK = dbResult.numClusters;
    // For DBSCAN metrics, exclude noise points
    const dbAssignmentsClean = dbResult.assignments.map(a => a === -1 ? dbK : a); // Treat noise as its own "cluster" for metrics
    const effectiveK = dbK > 0 ? dbK + (dbResult.noisePoints.length > 0 ? 1 : 0) : 1;

    results.push({
        algorithm: 'DBSCAN (auto-ε)',
        k: dbK,
        silhouette: effectiveK > 1 ? calculateSilhouette(scaledData, dbAssignmentsClean, effectiveK) : 0,
        dbi: effectiveK > 1 ? calculateDBI(scaledData, dbAssignmentsClean, effectiveK) : 0,
        ch: effectiveK > 1 ? calculateCH(scaledData, dbAssignmentsClean, effectiveK) : 0,
        noisePoints: dbResult.noisePoints.length,
        assignments: dbResult.assignments,
        labels,
    });

    return results;
};

// BoxPlotStat type now imported from types/energy.ts

export const getBoxPlotStats = (data: ClusteredData[], feature: string, cluster: number): BoxPlotStat | null => {
    const values = data
        .filter(d => d.cluster === cluster)
        .map(d => Number(d[feature]) || 0)
        .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const min = values[0];
    const max = values[values.length - 1];

    return { min, q1, median, q3, max };
};
