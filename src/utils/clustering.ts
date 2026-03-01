// K-Means clustering algorithm

// Calculate Euclidean distance between two points
export const euclideanDistance = (point1: number[], point2: number[]): number => {
    return Math.sqrt(point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0));
};

// Initialize centroids randomly from the data
export const initializeCentroids = (data: number[][], k: number): number[][] => {
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, k);
};

// Assign each data point to the nearest centroid
export const assignClusters = (data: number[][], centroids: number[][]): number[] => {
    return data.map(point => {
        let minDistance = Infinity;
        let closestCentroidIndex = 0;

        centroids.forEach((centroid, i) => {
            const distance = euclideanDistance(point, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                closestCentroidIndex = i;
            }
        });

        return closestCentroidIndex;
    });
};

// Update centroids based on current cluster assignments
export const updateCentroids = (data: number[][], assignments: number[], k: number): number[][] => {
    const newCentroids = Array.from({ length: k }, () => new Array(data[0].length).fill(0));
    const counts = new Array(k).fill(0);

    data.forEach((point, i) => {
        const clusterIndex = assignments[i];
        point.forEach((val, j) => {
            newCentroids[clusterIndex][j] += val;
        });
        counts[clusterIndex]++;
    });

    return newCentroids.map((centroid, i) =>
        counts[i] === 0 ? centroid : centroid.map(val => val / counts[i])
    );
};

// Calculate Z-Score normalization for a dataset column
export const standardizeData = (data: number[][]): number[][] => {
    if (data.length === 0) return data;
    const numFeatures = data[0].length;
    const means = new Array(numFeatures).fill(0);
    const stdDevs = new Array(numFeatures).fill(0);

    // Calculate means
    data.forEach(point => {
        point.forEach((val, i) => {
            means[i] += val;
        });
    });
    means.forEach((mean, i) => means[i] = mean / data.length);

    // Calculate standard deviations
    data.forEach(point => {
        point.forEach((val, i) => {
            stdDevs[i] += Math.pow(val - means[i], 2);
        });
    });
    stdDevs.forEach((variance, i) => stdDevs[i] = Math.sqrt(variance / data.length));

    // Normalize
    return data.map(point =>
        point.map((val, i) => stdDevs[i] === 0 ? 0 : (val - means[i]) / stdDevs[i])
    );
};

export interface KMeansResult {
    assignments: number[];
    centroids: number[][]; // Current centroids
}

// Main K-Means function
export const kmeans = (data: number[][], k: number, maxIterations = 100): KMeansResult => {
    if (data.length === 0) return { assignments: [], centroids: [] };

    const standardizedData = standardizeData(data);
    let centroids = initializeCentroids(standardizedData, k);
    let assignments: number[] = [];

    for (let i = 0; i < maxIterations; i++) {
        const newAssignments = assignClusters(standardizedData, centroids);

        // Check for convergence
        let hasConverged = true;
        if (assignments.length > 0) {
            for (let j = 0; j < newAssignments.length; j++) {
                if (newAssignments[j] !== assignments[j]) {
                    hasConverged = false;
                    break;
                }
            }
        } else {
            hasConverged = false;
        }

        if (hasConverged) {
            break;
        }

        assignments = newAssignments;
        centroids = updateCentroids(standardizedData, assignments, k);
    }

    return { assignments, centroids };
};
