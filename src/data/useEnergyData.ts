import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { kmeans } from '../utils/clustering';

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
    per_capita_toe?: number;
    renewable_share_elec?: number;
    gdp_pps?: number;
    mfg_share?: number;
    urb_rate?: number;
    hdd?: number;
    pop_density?: number;
    cluster?: number;
    clusterName?: string;
    [key: string]: string | number | undefined;
}

export const useEnergyData = () => {
    const [data, setData] = useState<EnergyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/unified_eu_energy_data_with_context.csv');
                const reader = response.body?.getReader();
                const result = await reader?.read();
                const decoder = new TextDecoder('utf-8');
                const csv = decoder.decode(result?.value);

                Papa.parse(csv, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results: Papa.ParseResult<EnergyData>) => {
                        const validData = (results.data as EnergyData[]).filter(row => row.country && row.year);

                        // --- Clustering Logic ---
                        // 1. Extract contextual data for the latest year (2023) to define country typologies
                        const latestYearData = validData.filter(row => row.year === 2023);

                        // We need countries that have all 5 features for clustering
                        const clusterableCountries = latestYearData.filter(
                            row => row.gdp_pps !== undefined && row.mfg_share !== undefined &&
                                row.urb_rate !== undefined && row.hdd !== undefined && row.pop_density !== undefined
                        );

                        // 2. Prepare data matrix for K-Means
                        const featuresMatrix = clusterableCountries.map(row => [
                            row.gdp_pps as number,
                            row.mfg_share as number,
                            row.urb_rate as number,
                            row.hdd as number,
                            row.pop_density as number
                        ]);

                        const countryCodes = clusterableCountries.map(row => row.country);

                        // 3. Run K-Means (k=4)
                        const k = 4;
                        const { assignments } = kmeans(featuresMatrix, k, 100);

                        // 4. Map cluster assignments back to countries
                        const countryClusterMap: Record<string, number> = {};
                        countryCodes.forEach((country, index) => {
                            countryClusterMap[country] = assignments[index];
                        });

                        // --- Compute meaningful typology names from centroid z-scores ---
                        const typoFeatures = ['gdp_pps', 'mfg_share', 'urb_rate', 'hdd', 'pop_density'] as const;
                        const typoDescriptors: Record<string, { high: string; low: string }> = {
                            gdp_pps:     { high: 'Wealthy',      low: 'Emerging'    },
                            mfg_share:   { high: 'Industrial',   low: 'Services'    },
                            urb_rate:    { high: 'Urban',        low: 'Rural'       },
                            hdd:         { high: 'Cold',         low: 'Warm'        },
                            pop_density: { high: 'Dense',        low: 'Sparse'      },
                        };

                        // Global means and stds across all clusterable countries
                        const typoGlobalMeans: Record<string, number> = {};
                        const typoGlobalStds:  Record<string, number> = {};
                        typoFeatures.forEach(f => {
                            const vals = clusterableCountries.map(r => r[f] as number).filter(v => !isNaN(v));
                            const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
                            const std  = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length || 1)) || 1;
                            typoGlobalMeans[f] = mean;
                            typoGlobalStds[f]  = std;
                        });

                        // Centroid means per cluster (using original unscaled values)
                        const typoCentroids: Record<number, Record<string, number>> = {};
                        for (let c = 0; c < k; c++) typoCentroids[c] = {};
                        const typoCounts: Record<number, number> = {};
                        for (let c = 0; c < k; c++) typoCounts[c] = 0;

                        clusterableCountries.forEach((row, idx) => {
                            const c = assignments[idx];
                            typoFeatures.forEach(f => {
                                typoCentroids[c][f] = (typoCentroids[c][f] || 0) + (row[f] as number);
                            });
                            typoCounts[c]++;
                        });
                        for (let c = 0; c < k; c++) {
                            typoFeatures.forEach(f => {
                                typoCentroids[c][f] /= (typoCounts[c] || 1);
                            });
                        }

                        // Name each cluster from its top-1 distinctive z-score feature
                        const usedNames = new Set<string>();
                        const clusterNames: string[] = [];
                        for (let c = 0; c < k; c++) {
                            const zScores = typoFeatures.map(f => ({
                                f,
                                z: (typoCentroids[c][f] - typoGlobalMeans[f]) / typoGlobalStds[f],
                            })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

                            let name = 'Balanced';
                            for (const { f, z } of zScores) {
                                const desc = typoDescriptors[f];
                                const candidate = Math.abs(z) > 0.4 ? (z > 0 ? desc.high : desc.low) : null;
                                if (candidate && !usedNames.has(candidate)) {
                                    name = candidate;
                                    usedNames.add(candidate);
                                    break;
                                }
                            }
                            clusterNames.push(name);
                        }

                        // 5. Assign cluster IDs to all rows in the dataset based on the country
                        const finalData = validData.map(row => {
                            const clusterId = countryClusterMap[row.country];
                            return {
                                ...row,
                                cluster: clusterId !== undefined ? clusterId : -1,
                                clusterName: clusterId !== undefined ? clusterNames[clusterId] : 'Unknown'
                            };
                        });

                        setData(finalData);
                        setLoading(false);
                    },
                    error: (err: unknown) => {
                        const message = err instanceof Error ? err.message : String(err);
                        setError(message);
                        setLoading(false);
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};
