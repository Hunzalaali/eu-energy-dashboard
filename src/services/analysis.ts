
import Papa from 'papaparse';
import { kmeans } from 'ml-kmeans';
import { UMAP } from 'umap-js';
import { TSNE } from '@keckelt/tsne';

export interface EnergyData {
    country: string;
    year: number;
    iso_alpha: string;
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
