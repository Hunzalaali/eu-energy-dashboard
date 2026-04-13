import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { EnergyData } from '../data/useEnergyData';


interface TypologyRadarChartProps {
    data: EnergyData[];
    year: number;
}

export const TypologyRadarChart: React.FC<TypologyRadarChartProps> = ({ data, year }) => {
    const radarData = useMemo(() => {
        // Use the selected year's data for building the radar profile
        const latestData = data.filter(d => d.year === year && d.cluster !== undefined && d.cluster !== -1);

        if (latestData.length === 0) return [];

        // We want to calculate the average values for each feature per cluster.
        // However, to display them on a radar chart effectively, we should use standardized values 
        // or scaled values so they all fit nicely (0-1 or 0-100 range).

        // First, collect the distinct clusters
        const clusters = Array.from(new Set(latestData.map(d => d.cluster))).sort();

        // Features to plot
        const features = ['gdp_pps', 'mfg_share', 'urb_rate', 'hdd', 'pop_density'] as const;
        const featureLabels = {
            gdp_pps: 'Wealth (GDP PPS)',
            mfg_share: 'Industrial (Mfg %)',
            urb_rate: 'Urbanization (%)',
            hdd: 'Cold Climate (HDD)',
            pop_density: 'Density'
        };

        // Prepare a matrix to standardize all features across all latest data
        // to map them to a 0-100 scale for plotting
        const rawMatrix = latestData.map(row => features.map(f => row[f] as number));

        // Min-Max scaling for visualization purposes (0 to 100)
        const mins = features.map((_, i) => Math.min(...rawMatrix.map(row => row[i])));
        const maxs = features.map((_, i) => Math.max(...rawMatrix.map(row => row[i])));

        const scale = (val: number, i: number) => {
            const range = maxs[i] - mins[i];
            if (range === 0) return 50;
            return ((val - mins[i]) / range) * 100;
        };

        const scaledAverages: Record<number, number[]> = {};
        clusters.forEach(c => {
            scaledAverages[c as number] = new Array(features.length).fill(0);
        });

        const counts: Record<number, number> = {};
        clusters.forEach(c => counts[c as number] = 0);

        latestData.forEach(row => {
            const c = row.cluster as number;
            features.forEach((f, i) => {
                scaledAverages[c][i] += scale(row[f] as number, i);
            });
            counts[c]++;
        });

        // Finalize averages
        clusters.forEach(c => {
            features.forEach((_, i) => {
                scaledAverages[c as number][i] /= counts[c as number];
            });
        });

        // Format for Recharts
        // Recharts expects array of objects like { subject: 'Math', A: 120, B: 110 }
        return features.map((f, i) => {
            const point: any = { subject: featureLabels[f] };
            clusters.forEach(c => {
                // Find cluster name from any item in that cluster
                const clusterName = latestData.find(d => d.cluster === c)?.clusterName || `Cluster ${c}`;
                point[clusterName] = Math.round(scaledAverages[c as number][i]); // Store scaled 0-100 value
            });
            return point;
        });

    }, [data, year]);

    // Colors for the 4 clusters
    const clusterColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

    // Dynamically get cluster names based on what's in the data
    const clusterNames = useMemo(() => {
        if (radarData.length === 0) return [];
        return Object.keys(radarData[0]).filter(k => k !== 'subject');
    }, [radarData]);

    if (radarData.length === 0) {
        return <div className="text-gray-500 italic p-4 text-center">Loading Typology Profiles...</div>;
    }

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 12 }} />
                    {/* Hide radius axis as it's scaled 0-100 */}
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                        formatter={(value: any) => [`${value} (Relative Score)`, '']}
                    />
                    <Legend />
                    {clusterNames.map((name, i) => (
                        <Radar
                            key={name}
                            name={name}
                            dataKey={name}
                            stroke={clusterColors[i % clusterColors.length]}
                            fill={clusterColors[i % clusterColors.length]}
                            fillOpacity={0.4}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
