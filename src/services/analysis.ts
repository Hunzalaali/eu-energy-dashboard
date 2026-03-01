
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

    // K-Means Clustering
    const clusteringResult = kmeans(scaledData, k, { initialization: 'kmeans++' });
    const clusters = clusteringResult.clusters;

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

        // Calculate Inertia (WCSS)
        let inertia = 0;
        result.clusters.forEach((clusterIdx, i) => {
            const centroid = result.centroids[clusterIdx];
            inertia += Math.pow(euclideanDistance(scaledData[i], centroid), 2);
        });

        // Calculate Silhouette Score (Simplified)
        let totalSilhouette = 0;
        if (k > 1) {
            const silhouettes = scaledData.map((point, i) => {
                const ownCluster = result.clusters[i];

                // a(i): Mean distance to other points in same cluster
                const sameClusterPoints = scaledData.filter((_, idx) => result.clusters[idx] === ownCluster);
                const a = sameClusterPoints.length > 1
                    ? sameClusterPoints.reduce((acc, p) => acc + euclideanDistance(point, p), 0) / (sameClusterPoints.length - 1)
                    : 0;

                // b(i): Mean distance to points in nearest neighboring cluster
                let minMeanDist = Infinity;
                for (let c = 0; c < k; c++) {
                    if (c === ownCluster) continue;
                    const otherClusterPoints = scaledData.filter((_, idx) => result.clusters[idx] === c);
                    if (otherClusterPoints.length > 0) {
                        const dist = otherClusterPoints.reduce((acc, p) => acc + euclideanDistance(point, p), 0) / otherClusterPoints.length;
                        if (dist < minMeanDist) minMeanDist = dist;
                    }
                }
                const b = minMeanDist;

                return (b - a) / Math.max(a, b);
            });
            totalSilhouette = silhouettes.reduce((acc, val) => acc + val, 0) / silhouettes.length;
        }

        return { k, inertia, silhouette: totalSilhouette };
    });
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
