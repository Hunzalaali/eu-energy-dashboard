/** A node in the dendrogram tree */
export interface DendrogramNode {
    id: number;
    left: DendrogramNode | null;
    right: DendrogramNode | null;
    height: number;    // Distance/dissimilarity at which this merge occurred
    size: number;      // Number of leaf nodes in this subtree
    label?: string;    // Country name (only for leaf nodes)
    members: number[]; // Indices of original data points in this cluster
}

export interface HierarchicalResult {
    /** Cluster assignments for each data point (0-indexed) */
    assignments: number[];
    /** The full dendrogram tree (root node) */
    dendrogram: DendrogramNode;
    /** Merge history: [i, j, distance, newClusterSize] per step */
    mergeHistory: [number, number, number, number][];
}



/**
 * Ward's distance between two clusters.
 * 
 * Ward's criterion: the increase in total within-cluster variance caused by merging.
 * d_Ward(A, B) = sqrt(2 * |A| * |B| / (|A| + |B|)) * d(centroid_A, centroid_B)
 */
function wardDistance(
    centroidA: number[], sizeA: number,
    centroidB: number[], sizeB: number
): number {
    let dist = 0;
    for (let k = 0; k < centroidA.length; k++) {
        dist += (centroidA[k] - centroidB[k]) ** 2;
    }
    return Math.sqrt((2 * sizeA * sizeB) / (sizeA + sizeB)) * Math.sqrt(dist);
}

/**
 * Perform hierarchical agglomerative clustering using Ward's method.
 * 
 * @param data - N×D matrix of standardized features
 * @param labels - Optional labels for leaf nodes (e.g., country codes)
 * @param k - Number of clusters to cut the dendrogram at
 * @returns Cluster assignments and dendrogram data
 */
export function hierarchicalClustering(
    data: number[][],
    labels?: string[],
    k: number = 4
): HierarchicalResult {
    const n = data.length;
    if (n === 0) return { assignments: [], dendrogram: { id: 0, left: null, right: null, height: 0, size: 0, members: [] }, mergeHistory: [] };

    const dim = data[0].length;

    // Initialize: each data point is its own cluster
    // Track active clusters, their centroids, sizes, and dendrogram nodes
    interface ClusterInfo {
        centroid: number[];
        size: number;
        node: DendrogramNode;
    }

    const clusters: Map<number, ClusterInfo> = new Map();
    let nextId = n; // IDs for merged nodes start after leaf IDs

    for (let i = 0; i < n; i++) {
        clusters.set(i, {
            centroid: [...data[i]],
            size: 1,
            node: {
                id: i,
                left: null,
                right: null,
                height: 0,
                size: 1,
                label: labels ? labels[i] : undefined,
                members: [i],
            }
        });
    }

    const mergeHistory: [number, number, number, number][] = [];

    // Iteratively merge the two closest clusters until only 1 remains
    while (clusters.size > 1) {
        let minDist = Infinity;
        let mergeA = -1;
        let mergeB = -1;

        const keys = Array.from(clusters.keys());

        // Find the pair with minimum Ward distance
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const a = clusters.get(keys[i])!;
                const b = clusters.get(keys[j])!;
                const d = wardDistance(a.centroid, a.size, b.centroid, b.size);
                if (d < minDist) {
                    minDist = d;
                    mergeA = keys[i];
                    mergeB = keys[j];
                }
            }
        }

        // Merge clusters mergeA and mergeB
        const cA = clusters.get(mergeA)!;
        const cB = clusters.get(mergeB)!;
        const newSize = cA.size + cB.size;

        // Update centroid (weighted average)
        const newCentroid = new Array(dim);
        for (let k = 0; k < dim; k++) {
            newCentroid[k] = (cA.centroid[k] * cA.size + cB.centroid[k] * cB.size) / newSize;
        }

        // Create new dendrogram node
        const newNode: DendrogramNode = {
            id: nextId,
            left: cA.node,
            right: cB.node,
            height: minDist,
            size: newSize,
            members: [...cA.node.members, ...cB.node.members],
        };

        mergeHistory.push([mergeA, mergeB, minDist, newSize]);

        // Remove old clusters, add new one
        clusters.delete(mergeA);
        clusters.delete(mergeB);
        clusters.set(nextId, {
            centroid: newCentroid,
            size: newSize,
            node: newNode,
        });

        nextId++;
    }

    // Get the root of the dendrogram
    const rootKey = Array.from(clusters.keys())[0];
    const dendrogram = clusters.get(rootKey)!.node;

    // Cut the dendrogram at k clusters
    const assignments = cutDendrogram(dendrogram, k, n);

    return { assignments, dendrogram, mergeHistory };
}

/**
 * Cut the dendrogram to produce exactly k clusters.
 * 
 * Strategy: Find the (k-1) highest merge distances and cut there.
 * Each subtree below those cuts becomes a cluster.
 */
function cutDendrogram(root: DendrogramNode, k: number, n: number): number[] {
    if (k >= n) {
        return Array.from({ length: n }, (_, i) => i);
    }
    if (k <= 1) {
        return new Array(n).fill(0);
    }

    // Start with the root
    const forest = [root];

    // Iteratively split the highest node until we have k trees
    for (let i = 0; i < k - 1; i++) {
        // Find the node with the highest height
        let maxIdx = -1;
        let maxHeight = -1;
        for (let j = 0; j < forest.length; j++) {
            const node = forest[j];
            if (node.left && node.right && node.height > maxHeight) {
                maxHeight = node.height;
                maxIdx = j;
            }
        }

        if (maxIdx === -1) break; // Cannot split further

        // Remove the highest node and add its two children
        const splitNode = forest.splice(maxIdx, 1)[0];
        forest.push(splitNode.left!);
        forest.push(splitNode.right!);
    }

    // Now forest contains exactly k (or fewer if couldn't split) nodes
    const assignments = new Array(n).fill(-1);
    
    forest.forEach((treeNode, clusterId) => {
        // Assign this clusterId to all leaf members of this tree
        treeNode.members.forEach(memberIdx => {
            assignments[memberIdx] = clusterId;
        });
    });

    return assignments;
}
