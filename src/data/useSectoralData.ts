import { useState, useEffect } from 'react';
import Papa from 'papaparse';

/**
 * Real sectoral GHG emissions data from Eurostat / EEA.
 * 
 * Data source: Eurostat dataset env_air_gge (Greenhouse gas emissions by source sector)
 * Reference: European Environment Agency, "Trends and projections in Europe 2024"
 * 
 * Sectors follow CRF (Common Reporting Format) mapping:
 *   - power:       CRF 1.A.1 — Fuel combustion in energy industries
 *   - industry:    CRF 1.A.2 — Fuel combustion in manufacturing & construction
 *   - transport:   CRF 1.A.3 — Fuel combustion in transport
 *   - buildings:   CRF 1.A.4 — Fuel combustion in residential & commercial sectors
 *   - agriculture: CRF 3     — Agriculture (enteric fermentation, manure, soils)
 * 
 * Units: Million tonnes CO₂-equivalent (MtCO₂eq)
 */
export interface SectoralEmissions {
    country: string;
    year: number;
    power: number;
    industry: number;
    transport: number;
    buildings: number;
    agriculture: number;
    total: number;
}

/**
 * Processed sectoral data with computed policy targets.
 * 
 * Targets are derived from the EU's Fit for 55 package:
 *   - 2030 target: −55% vs 2000 baseline (European Climate Law, Regulation 2021/1119)
 *   - 2050 target: Net-zero with ~10% residual (European Green Deal)
 */
export interface SectoralDataWithTargets extends SectoralEmissions {
    target2030: number;
    target2050: number;
    emissionsVs2000: number;  // Percentage change vs 2000 baseline
}

export const useSectoralData = (selectedCountry: string | null) => {
    const [rawData, setRawData] = useState<SectoralEmissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/eu_sectoral_emissions.csv');
                const reader = response.body?.getReader();
                const result = await reader?.read();
                const decoder = new TextDecoder('utf-8');
                const csv = decoder.decode(result?.value);

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

        // Find the 2000 baseline for target computation
        const baseline2000 = filtered.find(d => d.year === 2000);
        const baselineTotal = baseline2000 ? baseline2000.total : filtered[0]?.total || 1;

        // Compute targets and relative change
        return filtered.map(d => ({
            ...d,
            target2030: baselineTotal * 0.45,   // -55% = keep 45% of 2000
            target2050: baselineTotal * 0.10,    // Net-zero ≈ 10% residual
            emissionsVs2000: ((d.total - baselineTotal) / baselineTotal) * 100,
        }));
    })();

    return { data: processedData, rawData, loading, error };
};
