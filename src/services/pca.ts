/**
 * Principal Component Analysis (PCA) — Power Iteration Method
 *
 * PCA projects high-dimensional data onto its principal components
 * (eigenvectors of the covariance matrix). This implementation uses
 * iterative eigendecomposition suited for the small (27×7) matrices
 * typical in EU energy research.
 *
 * The biplot overlay shows feature loading arrows — the correlation
 * of each original variable with the principal components — enabling
 * interpretation of what drives spatial separation.
 *
 * Reference:
 *   Jolliffe, I.T. (2002). "Principal Component Analysis." 2nd Edition.
 *   Springer Series in Statistics.
 */

export interface PCAResult {
    /** Projected data: N × nComponents */
    projections: number[][];
    /** Eigenvalues (variance explained by each component) */
    eigenvalues: number[];
    /** Eigenvectors (each row is a component, each col is a feature) */
    eigenvectors: number[][];
    /** Feature loadings: correlation of features with components */
    loadings: number[][];
    /** Proportion of variance explained by each component */
    varianceExplained: number[];
    /** Cumulative variance explained */
    cumulativeVariance: number[];
}

/**
 * Perform PCA on a standardized N×D matrix.
 *
 * @param data - N×D standardized data matrix
 * @param nComponents - Number of principal components to extract (default 2)
 * @returns PCA results including projections, eigenvectors, and variance
 */
export function performPCA(data: number[][], nComponents: number = 2): PCAResult {
    const n = data.length;
    if (n === 0) {
        return {
            projections: [], eigenvalues: [], eigenvectors: [],
            loadings: [], varianceExplained: [], cumulativeVariance: [],
        };
    }

    const d = data[0].length;

    // 1. Center the data (should already be standardized, but ensure centering)
    const means = new Array(d).fill(0);
    for (let j = 0; j < d; j++) {
        for (let i = 0; i < n; i++) means[j] += data[i][j];
        means[j] /= n;
    }
    const centered = data.map(row => row.map((v, j) => v - means[j]));

    // 2. Compute covariance matrix (D × D)
    const cov: number[][] = [];
    for (let i = 0; i < d; i++) {
        cov.push(new Array(d).fill(0));
        for (let j = 0; j < d; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += centered[k][i] * centered[k][j];
            }
            cov[i][j] = sum / (n - 1);
        }
    }

    // 3. Extract eigenvalues/eigenvectors via power iteration with deflation
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];
    const covCopy = cov.map(row => [...row]);

    for (let comp = 0; comp < Math.min(nComponents, d); comp++) {
        // Power iteration
        let vec = new Array(d).fill(0).map(() => Math.random() - 0.5);
        let eigenvalue = 0;

        for (let iter = 0; iter < 200; iter++) {
            // Multiply by covariance matrix
            const newVec = new Array(d).fill(0);
            for (let i = 0; i < d; i++) {
                for (let j = 0; j < d; j++) {
                    newVec[i] += covCopy[i][j] * vec[j];
                }
            }

            // Compute eigenvalue (Rayleigh quotient)
            eigenvalue = Math.sqrt(newVec.reduce((acc, v) => acc + v * v, 0));
            if (eigenvalue < 1e-10) break;

            // Normalize
            vec = newVec.map(v => v / eigenvalue);
        }

        eigenvalues.push(eigenvalue);
        eigenvectors.push(vec);

        // Deflate: subtract projection of this eigenvector from the covariance matrix
        for (let i = 0; i < d; i++) {
            for (let j = 0; j < d; j++) {
                covCopy[i][j] -= eigenvalue * vec[i] * vec[j];
            }
        }
    }

    // 4. Project data onto principal components
    const projections = centered.map(row => {
        return eigenvectors.map(ev => {
            let sum = 0;
            for (let j = 0; j < d; j++) sum += row[j] * ev[j];
            return sum;
        });
    });

    // 5. Compute feature loadings
    // Loading = eigenvector * sqrt(eigenvalue) (correlation interpretation)
    const loadings = eigenvectors.map((ev, compIdx) => {
        const sqrtEv = Math.sqrt(eigenvalues[compIdx]);
        return ev.map(v => v * sqrtEv);
    });

    // 6. Proportion of variance explained
    // Total variance = sum of diagonal of original covariance matrix (trace)
    let totalCovVar = 0;
    for (let i = 0; i < d; i++) totalCovVar += cov[i][i];
    totalCovVar = totalCovVar || 1;

    const varianceExplained = eigenvalues.map(ev => ev / totalCovVar);
    const cumulativeVariance: number[] = [];
    varianceExplained.forEach((v, i) => {
        cumulativeVariance.push(v + (i > 0 ? cumulativeVariance[i - 1] : 0));
    });

    return {
        projections,
        eigenvalues,
        eigenvectors,
        loadings,
        varianceExplained,
        cumulativeVariance,
    };
}
