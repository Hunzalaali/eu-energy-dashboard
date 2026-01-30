import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export interface EnergyData {
    country: string;
    year: number;
    renewable_share: number;
    energy_dependency: number;
    ghg_intensity: number;
    energy_intensity: number;
    per_capita_toe: number;
    fossil_share: number;
    nuclear_share: number;
    renewable_share_elec: number;
}

export const useEnergyData = () => {
    const [data, setData] = useState<EnergyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/unified_eu_energy_data_clean.csv');
                const reader = response.body?.getReader();
                const result = await reader?.read();
                const decoder = new TextDecoder('utf-8');
                const csv = decoder.decode(result?.value);

                Papa.parse(csv, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results: Papa.ParseResult<EnergyData>) => {
                        // Filter out any empty rows possibly caused by trailing newlines
                        const validData = (results.data as EnergyData[]).filter(row => row.country && row.year);
                        setData(validData);
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
