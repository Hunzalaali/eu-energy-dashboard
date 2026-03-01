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

                        // Temporary heuristic naming based on typical cluster characteristics 
                        // (We'll refine these after seeing the initial output)
                        const clusterNames = [
                            "Typology A",
                            "Typology B",
                            "Typology C",
                            "Typology D"
                        ];

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
