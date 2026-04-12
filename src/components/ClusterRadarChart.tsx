import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';
import { type ClusteredData, getClusterCentroids, normalizeForRadar, FEATURES, getMetricLabel } from '../services/analysis';
import { useInteraction } from '../context/InteractionContext';
import { getClusterColorById } from '../utils/clusterColors';

interface ClusterRadarChartProps {
    data: ClusteredData[];
    clusterNames?: Record<number, string>;
}

const ClusterRadarChart: React.FC<ClusterRadarChartProps> = ({ data, clusterNames }) => {
    const { hoveredCountry, selectedCountry, selectedCluster } = useInteraction();

    const { chartData, clusters, countryOverlay } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], clusters: [], countryOverlay: null };

        const centroids = getClusterCentroids(data);
        const normalized = normalizeForRadar(data, centroids);
        const allClusters = Array.from(new Set(data.map(d => d.cluster))).sort();

        // Compute normalized values for the hovered/selected country to overlay
        let overlay: Record<string, number> | null = null;
        const highlightCountry = selectedCountry || hoveredCountry;
        if (highlightCountry) {
            const countryData = data.find(d => d.country === highlightCountry);
            if (countryData) {
                overlay = {};
                FEATURES.forEach(f => {
                    const values = data.map(d => Number(d[f]) || 0);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    overlay![f] = max > min ? (Number(countryData[f]) || 0 - min) / (max - min) : 0.5;
                });
            }
        }

        const result = FEATURES.map(feature => {
            const entry: Record<string, number | string> = { subject: getMetricLabel(feature) };
            normalized.forEach(c => {
                entry[`Cluster ${c.cluster}`] = c[feature];
            });
            if (overlay) {
                entry['Selected Country'] = overlay[feature];
            }
            return entry;
        });

        return { chartData: result, clusters: allClusters, countryOverlay: overlay };
    }, [data, hoveredCountry, selectedCountry]);

    if (data.length === 0) return <Text>No data available</Text>;

    return (
        <Paper shadow="xs" p="md" withBorder h="100%">
            <Title order={4} mb={4}>Cluster Profiles</Title>
            <Text size="xs" c="dimmed" mb="sm">
                {(selectedCountry || hoveredCountry) ? `Overlay: ${selectedCountry || hoveredCountry}` : 'Normalized feature fingerprints'}
            </Text>
            <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} />

                    {clusters.map((clusterId) => (
                        <Radar
                            key={clusterId}
                            name={clusterNames ? `${clusterNames[clusterId]} (C${clusterId})` : `C${clusterId}`}
                            dataKey={`Cluster ${clusterId}`}
                            stroke={getClusterColorById(clusterId, clusterNames)}
                            fill={getClusterColorById(clusterId, clusterNames)}
                            fillOpacity={selectedCluster !== null && selectedCluster !== clusterId ? 0.03 : 0.2}
                            strokeOpacity={selectedCluster !== null && selectedCluster !== clusterId ? 0.15 : 1}
                            strokeWidth={selectedCluster === clusterId ? 3 : 1.5}
                        />
                    ))}

                    {/* Country overlay line */}
                    {countryOverlay && (
                        <Radar
                            name={selectedCountry || hoveredCountry || 'Country'}
                            dataKey="Selected Country"
                            stroke="#e03131"
                            fill="#e03131"
                            fillOpacity={0.08}
                            strokeWidth={3}
                            strokeDasharray="4 2"
                        />
                    )}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
            </ResponsiveContainer>
        </Paper>
    );
};

export default ClusterRadarChart;
