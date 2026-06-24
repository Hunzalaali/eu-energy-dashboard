export interface DBSCANResult {
    /** Cluster assignments (-1 = noise/outlier, 0+ = cluster ID) */
    assignments: number[];
    /** Number of clusters found (not counting noise) */
    numClusters: number;
    /** Indices of noise points */
    noisePoints: number[];
    /** Core points per cluster */
    corePoints: Map<number, number[]>;
}

/**
 * Compute Euclidean distance between two points.
 */
function euclideanDist(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
}

/**
 * Find all points within epsilon distance of point at index `idx`.
 */
function regionQuery(data: number[][], idx: number, epsilon: number): number[] {
    const neighbors: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (euclideanDist(data[idx], data[i]) <= epsilon) {
            neighbors.push(i);
        }
    }
    return neighbors;
}

/**
 * Run DBSCAN clustering on standardized data.
 * 
 * @param data - N×D matrix of standardized features
 * @param epsilon - Neighborhood radius (default: auto-computed)
 * @param minPoints - Minimum points to form a cluster (default: 3 for small datasets)
 * @returns Cluster assignments and metadata
 */
export function dbscan(
    data: number[][],
    epsilon?: number,
    minPoints: number = 3
): DBSCANResult {
    const n = data.length;
    if (n === 0) return { assignments: [], numClusters: 0, noisePoints: [], corePoints: new Map() };

    // Auto-compute epsilon if not provided
    // Heuristic: use the k-th nearest neighbor distance (k = minPoints)
    // sorted and look for the "elbow"
    if (!epsilon) {
        epsilon = autoEpsilon(data, minPoints);
    }

    const UNVISITED = -2;
    const NOISE = -1;
    const assignments = new Array(n).fill(UNVISITED);
    let clusterId = 0;
    const corePoints = new Map<number, number[]>();

    for (let i = 0; i < n; i++) {
        if (assignments[i] !== UNVISITED) continue;

        const neighbors = regionQuery(data, i, epsilon);

        if (neighbors.length < minPoints) {
            // Mark as noise (might be claimed later by a cluster)
            assignments[i] = NOISE;
            continue;
        }

        // Start a new cluster
        assignments[i] = clusterId;
        const cores: number[] = [i];

        // Process the seed set
        const seedSet = [...neighbors];
        let j = 0;

        while (j < seedSet.length) {
            const q = seedSet[j];

            if (assignments[q] === NOISE) {
                // Noise point claimed by this cluster (border point)
                assignments[q] = clusterId;
            }

            if (assignments[q] !== UNVISITED) {
                j++;
                continue;
            }

            // Mark as member of this cluster
            assignments[q] = clusterId;

            const qNeighbors = regionQuery(data, q, epsilon);
            if (qNeighbors.length >= minPoints) {
                // q is a core point — add its neighbors to the seed set
                cores.push(q);
                for (const nn of qNeighbors) {
                    if (!seedSet.includes(nn)) {
                        seedSet.push(nn);
                    }
                }
            }

            j++;
        }

        corePoints.set(clusterId, cores);
        clusterId++;
    }

    const noisePoints = assignments
        .map((a, i) => a === NOISE ? i : -1)
        .filter(i => i !== -1);

    return {
        assignments,
        numClusters: clusterId,
        noisePoints,
        corePoints,
    };
}

/**
 * Auto-compute epsilon using the k-distance graph heuristic.
 * 
 * For each point, compute the distance to its k-th nearest neighbor.
 * Sort these distances and look for a natural gap.
 * The elbow of this curve is a good epsilon.
 */
function autoEpsilon(data: number[][], k: number): number {
    const n = data.length;
    const kDistances: number[] = [];

    for (let i = 0; i < n; i++) {
        const distances: number[] = [];
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                distances.push(euclideanDist(data[i], data[j]));
            }
        }
        distances.sort((a, b) => a - b);
        kDistances.push(distances[Math.min(k - 1, distances.length - 1)]);
    }

    // Sort k-distances
    kDistances.sort((a, b) => a - b);

    // Find the elbow: point with maximum second derivative
    // Simple heuristic: use the value at the 75th percentile
    const elbowIdx = Math.floor(n * 0.75);
    return kDistances[elbowIdx];
}

/**
 * Suggest optimal epsilon values by computing the k-distance graph.
 * Returns sorted k-distances for the user to inspect.
 */
export function computeKDistances(data: number[][], k: number = 3): number[] {
    const n = data.length;
    const kDistances: number[] = [];

    for (let i = 0; i < n; i++) {
        const distances: number[] = [];
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                distances.push(euclideanDist(data[i], data[j]));
            }
        }
        distances.sort((a, b) => a - b);
        kDistances.push(distances[Math.min(k - 1, distances.length - 1)]);
    }

    return kDistances.sort((a, b) => a - b);
}
