import type { EnergyData } from './useEnergyData';

// Deterministically generate fake sectoral breakdown based on contextual data
// If `mfg_share` is high, allocate more to industry
// If `hdd` is high, allocate more to buildings
// Power is somewhat related to fossil share
// Transport is a large chunk of the remainder

export interface SectoralEmissions {
    year: number;
    transport: number;
    industry: number;
    buildings: number;
    power: number;
    agriculture: number;
    total: number;
    target2030: number;
    target2050: number;
    emissionsVs1990: number;
}

// Pseudo-random number generator based on seed (country code) to keep it stable
const pseudoRandom = (seed: string, year: number) => {
    let hash = 0;
    const str = seed + year.toString();
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
};

const getBase1990Emissions = (country: string) => {
    // Arbitrary base scales for EU countries
    const scales: Record<string, number> = {
        'DE': 1250, 'FR': 540, 'IT': 520, 'PL': 470, 'ES': 290,
        'NL': 220, 'RO': 240, 'CZ': 190, 'BE': 140, 'EL': 100,
        'SE': 70, 'AT': 80, 'BG': 100, 'FI': 70, 'DK': 70,
        'SK': 70, 'IE': 55, 'HR': 30, 'LT': 50, 'SI': 20,
        'LV': 25, 'EE': 40, 'CY': 5, 'LU': 13, 'MT': 2, 'PT': 60, 'HU': 90
    };
    return scales[country] || 100;
};

export const generateMockSectoralData = (data: EnergyData[], selectedCountry: string | null): SectoralEmissions[] => {
    // Filter by selected country, or if none, we could aggregate. For now let's just use DE as a default if none selected for illustration
    const countryData = selectedCountry
        ? data.filter(d => d.country === selectedCountry)
        : data.filter(d => d.country === 'DE'); // Fallback to DE if no country selected to show something 

    const base1990 = getBase1990Emissions(selectedCountry || 'DE');

    return countryData.sort((a, b) => a.year - b.year).map(d => {
        const rand = pseudoRandom(d.country, d.year);

        // Use real fields to influence the fake sectors
        const intensity = d.ghg_intensity || 5;
        const mfgShare = d.mfg_share || 15;
        const hdd = d.hdd || 2000;

        // Base total around the 1990 scale but dropping over time
        const yearProgress = (d.year - 1990) / 40; // 0 in 1990, ~0.8 in 2023
        const emissionReductionFactor = 1 - (yearProgress * (0.2 + (rand * 0.1))); // Dropped 20-30% since 1990

        const totalEmissions = base1990 * emissionReductionFactor * (intensity / 5); // scale by actual ghg_intensity relative to avg EU

        // Industry share (15-30% based on mfg_share)
        const industryShare = Math.min(0.4, Math.max(0.1, (mfgShare / 100) * 1.5));

        // Building share (10-25% based on hdd)
        const buildingShare = Math.min(0.3, Math.max(0.05, (hdd / 5000)));

        // Power share (drops heavily as renewable_share goes up)
        const powerShare = Math.max(0.1, 0.4 * (1 - ((d.renewable_share || 20) / 100)));

        const remaining = 1 - industryShare - buildingShare - powerShare;

        // Give transport 70% of remaining, agriculture 30%
        const transportShare = remaining * 0.7;
        const agricultureShare = remaining * 0.3;

        // The absolute numbers
        const industry = totalEmissions * industryShare;
        const buildings = totalEmissions * buildingShare;
        const power = totalEmissions * powerShare;
        const transport = totalEmissions * transportShare;
        const agriculture = totalEmissions * agricultureShare;

        const emissionsVs1990 = ((totalEmissions - base1990) / base1990) * 100;

        return {
            year: d.year,
            total: totalEmissions,
            industry,
            buildings,
            power,
            transport,
            agriculture,
            target2030: base1990 * 0.45, // -55% target
            target2050: base1990 * 0.1, // Net zero (10% residual)
            emissionsVs1990: emissionsVs1990
        };
    });
};
