import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { EnergyData } from '../types/energy';

export type { EnergyData } from '../types/energy';

export const useEnergyData = () => {
    const [data, setData] = useState<EnergyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/unified_eu_energy_data_with_context.csv');
                const csv = await response.text();

                Papa.parse(csv, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results: Papa.ParseResult<EnergyData>) => {
                        const validData = (results.data as EnergyData[]).filter(row => row.country && row.year);

                        // --- Typology Assignment ---
                        // We use a principled 2×2 matrix based on two orthogonal structural dimensions:
                        //   Axis 1 — Economic Development: GDP per capita (PPS)
                        //   Axis 2 — Climate Energy Context: Heating Degree Days (HDD)

                        const contextRows = validData.filter(
                            row => row.year === 2023 && row.gdp_pps !== undefined && row.hdd !== undefined
                        );

                        // Median split points
                        const sortedGDP = [...contextRows.map(r => r.gdp_pps as number)].sort((a, b) => a - b);
                        const sortedHDD = [...contextRows.map(r => r.hdd as number)].sort((a, b) => a - b);
                        const medianGDP = sortedGDP[Math.floor(sortedGDP.length / 2)] ?? 100;
                        const medianHDD = sortedHDD[Math.floor(sortedHDD.length / 2)] ?? 3000;

                        // Quadrant IDs (fixed, deterministic)
                        // 0: Affluent Warm, 1: Affluent Cold, 2: Developing Warm, 3: Developing Cold
                        const TYPOLOGY_NAMES = [
                            'Affluent Warm',
                            'Affluent Cold',
                            'Developing Warm',
                            'Developing Cold',
                        ];

                        const countryTypologyMap: Record<string, { clusterId: number; clusterName: string }> = {};
                        contextRows.forEach(row => {
                            const highGDP = (row.gdp_pps as number) >= medianGDP;
                            const highHDD = (row.hdd as number) >= medianHDD;
                            const clusterId = highGDP && !highHDD ? 0
                                : highGDP && highHDD ? 1
                                : !highGDP && !highHDD ? 2
                                : 3;
                            countryTypologyMap[row.country] = { clusterId, clusterName: TYPOLOGY_NAMES[clusterId] };
                        });

                        // Assign to all rows in the dataset
                        const finalData = validData.map(row => {
                            const typo = countryTypologyMap[row.country];
                            return {
                                ...row,
                                cluster:     typo?.clusterId  ?? -1,
                                clusterName: typo?.clusterName ?? 'Unknown',
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
