
import Papa from 'papaparse';
import { kmeans } from 'ml-kmeans';
import { UMAP } from 'umap-js';
import { TSNE } from '@keckelt/tsne';

export interface EnergyData {
    country: string;
    year: number;
    iso_alpha?: string;
    renewable_share: number;
    energy_dependency: number;
    ghg_intensity: number;
    energy_intensity: number;
    fossil_share: number;
    nuclear_share: number;
    renewable_share_elec?: number;
    per_capita_toe?: number;
    [key: string]: string | number | undefined;
}

export interface ClusteredData extends EnergyData {
    cluster: number;
    clusterTimeSeries?: number;
    tsneX?: number;
    tsneY?: number;
    umapX?: number;
    umapY?: number;
}

export const FEATURES = [
    'renewable_share',
    'energy_dependency',
    'ghg_intensity',
    'energy_intensity',
    'per_capita_toe',
    'fossil_share',
    'nuclear_share',
];

export const loadData = async (): Promise<EnergyData[]> => {
    const response = await fetch('/data.csv');
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            complete: (results: Papa.ParseResult<EnergyData>) => {
                // Filter out empty rows or bad data if necessary
                const data = results.data as EnergyData[];
                resolve(data.filter(row => row.country && row.year));
            },
            error: (error: Error) => reject(error),
        });
    });
};

export const performAnalysis = (data: EnergyData[], year: number, k: number = 4): ClusteredData[] => {
    const yearData = data.filter((d) => d.year === year);

    if (yearData.length === 0) return [];

    // Extract features for clustering
    const dataset = yearData.map((d) =>
        FEATURES.map((f) => (typeof d[f] === 'number' ? d[f] : 0))
    ) as number[][];

    // Check if we have enough data
    if (dataset.length < k) {
        console.warn("Not enough data points for clustering");
        return yearData.map(d => ({ ...d, cluster: 0 }));
    }

    // Standardization (Z-score normalization)
    const means = FEATURES.map((_, i) =>
        dataset.reduce((acc, row) => acc + row[i], 0) / dataset.length
    );

    const stds = FEATURES.map((_, i) => {
        const mean = means[i];
        const variance = dataset.reduce((acc, row) => acc + Math.pow(row[i] - mean, 2), 0) / dataset.length;
        return Math.sqrt(variance) || 1; // Avoid division by zero
    });

    const scaledData = dataset.map(row =>
        row.map((val, i) => (val - means[i]) / stds[i])
    );

    // K-Means Clustering — consensus run (pick best of 15 by lowest inertia)
    // This dramatically reduces variance from random initialisation.
    const euclidDist = (a: number[], b: number[]) =>
        Math.sqrt(a.reduce((acc, v, i) => acc + Math.pow(v - b[i], 2), 0));

    let bestClusters: number[] = [];
    let bestCentroids: number[][] = [];
    let bestInertia = Infinity;

    for (let run = 0; run < 15; run++) {
        const result = kmeans(scaledData, k, { initialization: 'kmeans++' });
        let inertia = 0;
        result.clusters.forEach((ci, i) => {
            inertia += Math.pow(euclidDist(scaledData[i], result.centroids[ci]), 2);
        });
        if (inertia < bestInertia) {
            bestInertia   = inertia;
            bestClusters  = result.clusters;
            bestCentroids = result.centroids;
        }
    }

    // Deterministic label normalisation — sort cluster IDs by their centroid's
    // renewable_share value (index 0 in FEATURES), ascending.
    // This means cluster 0 is always the least-renewable group, cluster k-1 is
    // always the most-renewable group, regardless of random seed or year.
    const renewableIdx = FEATURES.indexOf('renewable_share'); // 0
    const sortedClusterIds = Array.from({ length: k }, (_, i) => i)
        .sort((a, b) => (bestCentroids[a]?.[renewableIdx] ?? 0) - (bestCentroids[b]?.[renewableIdx] ?? 0));

    // Build old-id → new-id mapping
    const clusterRemap: Record<number, number> = {};
    sortedClusterIds.forEach((oldId, newId) => { clusterRemap[oldId] = newId; });

    const clusters = bestClusters.map(c => clusterRemap[c] ?? c);


    // t-SNE
    let tsneResults: number[][] = [];
    try {
        const tsne = new TSNE({
            dim: 2,
            perplexity: Math.min(30, scaledData.length - 1), // Perplexity must be < N
            earlyExaggeration: 4.0,
            learningRate: 100.0,
            epsilon: 10,
            metric: 'euclidean'
        });
        tsne.initDataRaw(scaledData);
        // Run iterations
        for (let i = 0; i < 500; i++) {
            tsne.step();
        }
        tsneResults = tsne.getSolution();
    } catch (e) {
        console.error("t-SNE failed", e);
        tsneResults = scaledData.map(() => [0, 0]);
    }

    // UMAP
    let umapResults: number[][] = [];
    try {
        const umap = new UMAP({
            nComponents: 2,
            nEpochs: 400, // Reduced epochs for performance
            nNeighbors: Math.min(15, scaledData.length - 1),
        });
        umapResults = umap.fit(scaledData);
    } catch (e) {
        console.error("UMAP failed", e);
        umapResults = scaledData.map(() => [0, 0]);
    }

    // Combine results
    return yearData.map((d, i) => ({
        ...d,
        cluster: clusters[i],
        tsneX: tsneResults[i] ? tsneResults[i][0] : 0,
        tsneY: tsneResults[i] ? tsneResults[i][1] : 0,
        umapX: umapResults[i] ? umapResults[i][0] : 0,
        umapY: umapResults[i] ? umapResults[i][1] : 0,
    }));
};

export interface ClusterCentroid {
    cluster: number;
    [key: string]: number;
}

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
        const result = kmeans(dataset, k, { initialization: 'kmeans++' });

        return data.map((d, i) => ({
            ...d,
            cluster: result.clusters[i]
        }));
    } catch (e) {
        console.error("Reclustering failed", e);
        return data;
    }
};

export const performTimeSeriesAnalysis = (data: EnergyData[], k: number = 4): Map<string, number> => {
    // 1. Get all unique countries and years
    const countries = Array.from(new Set(data.map(d => d.country)));
    const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);

    // 2. Pivot data: Create a feature vector for each country
    const trainingData: number[][] = [];
    const countryList: string[] = [];

    countries.forEach(country => {
        const countryData = data.filter(d => d.country === country);
        if (countryData.length === 0) return;

        const vector: number[] = [];
        let hasData = true;

        years.forEach(year => {
            const yearEntry = countryData.find(d => d.year === year);
            FEATURES.forEach(feature => {
                vector.push(Number(yearEntry ? yearEntry[feature] : 0) || 0);
            });
        });

        if (hasData) {
            trainingData.push(vector);
            countryList.push(country);
        }
    });

    if (trainingData.length < k) return new Map();

    // 3. Standardization (per column/feature-year)
    const numFeatures = trainingData[0].length;
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);

    for (let j = 0; j < numFeatures; j++) {
        let sum = 0;
        for (let i = 0; i < trainingData.length; i++) sum += trainingData[i][j];
        means[j] = sum / trainingData.length;
    }

    for (let j = 0; j < numFeatures; j++) {
        let sumSq = 0;
        for (let i = 0; i < trainingData.length; i++) sumSq += Math.pow(trainingData[i][j] - means[j], 2);
        stds[j] = Math.sqrt(sumSq / trainingData.length) || 1;
    }

    const scaledData = trainingData.map(row =>
        row.map((val, j) => (val - means[j]) / stds[j])
    );

    // 4. K-Means
    try {
        const result = kmeans(scaledData, k, { initialization: 'kmeans++' });

        // 5. Map back to country
        const clusterMap = new Map<string, number>();
        result.clusters.forEach((clusterIndex, i) => {
            clusterMap.set(countryList[i], clusterIndex);
        });
        return clusterMap;
    } catch (e) {
        console.error("Time series clustering failed", e);
        return new Map();
    }
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
    const yearData = data.filter((d) => d.year === year);
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
        const result = kmeans(scaledData, k, { initialization: 'kmeans++' });

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

    // Descriptive name fragments
    const featureDescriptors: Record<string, { high: string; low: string }> = {
        'renewable_share': { high: 'Green', low: 'Low-Renewable' },
        'energy_dependency': { high: 'Import-Dependent', low: 'Self-Sufficient' },
        'ghg_intensity': { high: 'Carbon-Intensive', low: 'Low-Carbon' },
        'energy_intensity': { high: 'Energy-Intensive', low: 'Efficient' },
        'per_capita_toe': { high: 'High-Consumption', low: 'Low-Consumption' },
        'fossil_share': { high: 'Fossil-Reliant', low: 'Post-Fossil' },
        'nuclear_share': { high: 'Nuclear-Powered', low: '' },
    };

    clusters.forEach(clusterId => {
        const clusterPoints = data.filter(d => d.cluster === clusterId);
        if (clusterPoints.length === 0) {
            names[clusterId] = 'Empty';
            return;
        }

        // Compute z-scores for this cluster's centroid
        const zScores: { feature: string; z: number }[] = FEATURES.map(f => {
            const clusterMean = clusterPoints.reduce((a, d) => a + (Number(d[f]) || 0), 0) / clusterPoints.length;
            return { feature: f, z: (clusterMean - globalMeans[f]) / globalStds[f] };
        });

        // Sort by absolute z-score, pick top distinctive features
        const sorted = zScores
            .filter(z => Math.abs(z.z) > 0.5)
            .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

        if (sorted.length === 0) {
            names[clusterId] = 'Mixed Profile';
            return;
        }

        // Build name from top 1-2 distinctive features
        const parts: string[] = [];
        for (let i = 0; i < Math.min(2, sorted.length); i++) {
            const { feature, z } = sorted[i];
            const desc = featureDescriptors[feature];
            if (desc) {
                parts.push(z > 0 ? desc.high : desc.low);
            }
        }

        names[clusterId] = parts.filter(p => p.length > 0).join(' & ') || 'Mixed Profile';
    });

    return names;
};

// --- Cluster Naming & Characterization ---

const getSimpleFeatureName = (key: string) => {
    const map: Record<string, string> = {
        'renewable_share': 'Renewables',
        'energy_dependency': 'Imports',
        'ghg_intensity': 'Carbon',
        'energy_intensity': 'Intensity',
        'per_capita_toe': 'Consumption',
        'fossil_share': 'Fossil',
        'nuclear_share': 'Nuclear',
    };
    return map[key] || 'Mixed';
}

export const assignClusterNames = (centroids: ClusterCentroid[]): Record<number, string> => {
    // Simple heuristic-based naming
    // We look at the top 1-2 features that distinguish the cluster
    // normalized centroids are best for this.

    // Note: centroids passed here should be NORMALIZED (0-1) for fair comparison

    const names: Record<number, string> = {};

    centroids.forEach(c => {
        // Find features with highest values
        const features = Object.keys(c).filter(k => k !== 'cluster');
        const sortedFeatures = features
            .map(f => ({ feature: f, value: c[f] }))
            .sort((a, b) => b.value - a.value);

        const top1 = sortedFeatures[0];
        const top2 = sortedFeatures[1];

        let name = "Mixed Profile";

        // Logic for naming based on dominant features
        if (top1.feature === 'renewable_share' && top1.value > 0.6) {
            name = "Green Pioneers";
        } else if (top1.feature === 'nuclear_share' && top1.value > 0.5) {
            name = "Nuclear Core";
        } else if (top1.feature === 'fossil_share' && top1.value > 0.6) {
            name = "Fossil Dependent";
        } else if (top1.feature === 'energy_dependency' && top1.value > 0.6) {
            name = "Import Dependent";
        } else if (top1.feature === 'ghg_intensity' && top1.value > 0.6) {
            name = "Carbon Intensive";
        } else if (top1.feature === 'energy_intensity' && top1.value > 0.6) {
            name = "High Intensity"
        } else {
            // Composite names
            const f1 = getSimpleFeatureName(top1.feature);
            const f2 = getSimpleFeatureName(top2.feature);
            name = `${f1} & ${f2} Driven`;
        }

        names[c.cluster] = name;
    });

    return names;
};


/**
 * Comparative Algorithm Analysis
 * 
 * Runs K-Means, Hierarchical (Ward's), and DBSCAN on the same data,
 * then computes validation metrics for each. This is the core of the
 * methodology comparison needed for the thesis.
 */
import { hierarchicalClustering } from './hierarchicalClustering';
import { dbscan } from './dbscan';

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

export const compareAlgorithms = (data: EnergyData[], year: number, k: number = 4): AlgorithmComparison[] => {
    const yearData = data.filter((d) => d.year === year);
    if (yearData.length < k) return [];

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
        const result = kmeans(scaledData, k, { initialization: 'kmeans++' });
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

export interface BoxPlotStat {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
}

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
