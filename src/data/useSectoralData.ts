import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { SectoralEmissions, SectoralDataWithTargets } from '../types/energy';

// Re-export so existing component imports still work
export type { SectoralEmissions, SectoralDataWithTargets } from '../types/energy';

export const useSectoralData = (selectedCountry: string | null) => {
    const [rawData, setRawData] = useState<SectoralEmissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/eu_sectoral_emissions.csv');
                const csv = await response.text();

                Papa.parse(csv, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results: Papa.ParseResult<SectoralEmissions>) => {
                        const validData = (results.data as SectoralEmissions[]).filter(
                            row => row.country && row.year && row.total > 0
                        );
                        setRawData(validData);
                        setLoading(false);
                    },
                    error: (err: unknown) => {
                        const message = err instanceof Error ? err.message : String(err);
                        setError(message);
                        setLoading(false);
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch sectoral emissions data');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /**
     * Filter and enrich data for the selected country.
     * If no country is selected, aggregates across all EU-27 states.
     */
    const processedData: SectoralDataWithTargets[] = (() => {
        if (rawData.length === 0) return [];

        let filtered: SectoralEmissions[];

        if (selectedCountry) {
            filtered = rawData.filter(d => d.country === selectedCountry);
        } else {
            // Aggregate all EU-27 countries by year
            const yearMap = new Map<number, SectoralEmissions>();
            rawData.forEach(row => {
                const existing = yearMap.get(row.year);
                if (existing) {
                    existing.power += row.power;
                    existing.industry += row.industry;
                    existing.transport += row.transport;
                    existing.buildings += row.buildings;
                    existing.agriculture += row.agriculture;
                    existing.total += row.total;
                } else {
                    yearMap.set(row.year, { ...row, country: 'EU-27' });
                }
            });
            filtered = Array.from(yearMap.values());
        }

        // Sort by year
        filtered.sort((a, b) => a.year - b.year);

        // Find the 1990 baseline for target computation (Legally required by Fit for 55)
        const baseline1990 = filtered.find(d => d.year === 1990);
        const baselineTotal = baseline1990 ? baseline1990.total : filtered[0]?.total || 1;

        // Compute targets and relative change
        return filtered.map(d => ({
            ...d,
            target2030: baselineTotal * 0.45,   // -55% = keep 45% of 1990
            target2050: baselineTotal * 0.10,    // Net-zero ≈ 10% residual
            emissionsVs1990: ((d.total - baselineTotal) / baselineTotal) * 100,
        }));
    })();

    return { data: processedData, rawData, loading, error };
};
