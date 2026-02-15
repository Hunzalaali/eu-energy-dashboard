import React, { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { type ClusteredData, getMetricLabel } from "../services/analysis";
import { Tooltip, Paper, Text, Group } from "@mantine/core";

// GeoJSON/TopoJSON for Europe. Using a world map and zooming in is often easiest for stability.
// GeoJSON/TopoJSON for Europe. Using a world map and zooming in is often easiest for stability.
const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const EUROPE_COUNTRIES = [
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herz.",
    "Bulgaria", "Croatia", "Cyprus", "Czech Rep.", "Denmark", "Estonia",
    "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland",
    "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg",
    "Macedonia", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands",
    "Norway", "Poland", "Portugal", "Romania", "Russia", "San Marino",
    "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
    "Turkey", "Ukraine", "United Kingdom", "Vatican"
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

const NAME_TO_ISO: { [key: string]: string } = {
    "Austria": "AT",
    "Belgium": "BE",
    "Bulgaria": "BG",
    "Cyprus": "CY",
    "Czech Rep.": "CZ",
    "Germany": "DE",
    "Denmark": "DK",
    "Estonia": "EE",
    "Greece": "EL",
    "Spain": "ES",
    "Finland": "FI",
    "France": "FR",
    "Croatia": "HR",
    "Hungary": "HU",
    "Ireland": "IE",
    "Italy": "IT",
    "Lithuania": "LT",
    "Luxembourg": "LU",
    "Latvia": "LV",
    "Malta": "MT",
    "Netherlands": "NL",
    "Poland": "PL",
    "Portugal": "PT",
    "Romania": "RO",
    "Sweden": "SE",
    "Slovenia": "SI",
    "Slovakia": "SK",
    "United Kingdom": "UK"
};

interface MapChartProps {
    data: ClusteredData[];
    metric: string;
    mode?: 'metric' | 'cluster';
}

const METRIC_COLORS = [
    "#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6",
    "#4292c6", "#2171b5", "#08519c", "#08306b"
];

const MapChart: React.FC<MapChartProps> = ({ data, metric, mode = 'metric' }) => {
    // console.log(data, metric, mode);

    const { colorScale, min, max } = useMemo(() => {
        if (mode === 'cluster') return { colorScale: null, min: 0, max: 0 };

        const values = data.map((d) => Number(d[metric]) || 0);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);

        const scale = scaleQuantize<string>()
            .domain([minVal, maxVal])
            .range(METRIC_COLORS);

        return { colorScale: scale, min: minVal, max: maxVal };
    }, [data, metric, mode]);

    const dataMap = useMemo(() => {
        const map = new Map();
        data.forEach((d) => {
            if (mode === 'cluster') {
                map.set(d.iso_alpha, { value: d.cluster, label: `Cluster ${d.cluster}` });
                map.set(d.country, { value: d.cluster, label: `Cluster ${d.cluster}` });
            } else {
                map.set(d.iso_alpha, { value: d[metric], label: Number(d[metric])?.toFixed(2) });
                map.set(d.country, { value: d[metric], label: Number(d[metric])?.toFixed(2) });
            }
        });
        return map;
    }, [data, metric, mode]);

    // Center on Europe approx
    return (
        <Paper shadow="xs" p="md" withBorder style={{ height: "500px", overflow: "hidden" }}>
            <Group justify="space-between" mb="sm">
                <Text size="lg" fw={700}>
                    {mode === 'cluster' ? 'Cluster Membership' : getMetricLabel(metric)}
                </Text>
                {mode === 'cluster' && (
                    <Group gap="xs">
                        {Array.from(new Set(data.map(d => d.cluster))).sort().map(cluster => (
                            <Group key={cluster} gap={4}>
                                <div style={{ width: 10, height: 10, backgroundColor: COLORS[cluster % COLORS.length], borderRadius: '50%' }} />
                                <Text size="xs">C{cluster}</Text>
                            </Group>
                        ))}
                    </Group>
                )}
                {mode === 'metric' && (
                    <Group gap="xs">
                        <Text size="xs">{min.toFixed(2)}</Text>
                        <div style={{
                            width: 100,
                            height: 10,
                            background: `linear-gradient(to right, ${METRIC_COLORS.join(', ')})`,
                            borderRadius: 4
                        }} />
                        <Text size="xs">{max.toFixed(2)}</Text>
                    </Group>
                )}
            </Group>

            <ComposableMap projection="geoMercator" projectionConfig={{ center: [10, 30], scale: 250 }}>
                {/* ZoomableGroup can be tricky with sizing, sometimes better without if fixed region */}
                <Geographies geography={GEO_URL}>
                    {({ geographies }: { geographies: any[] }) =>
                        geographies
                            .filter((geo) => EUROPE_COUNTRIES.includes(geo.properties.name))
                            .map((geo) => {
                                const iso = NAME_TO_ISO[geo.properties.name];
                                const dataPoint = (iso ? dataMap.get(iso) : undefined) || dataMap.get(geo.properties.name) || dataMap.get(geo.id);
                                const curValue = dataPoint?.value;

                                let fill = "#EEE";
                                if (curValue !== undefined) {
                                    if (mode === 'cluster') {
                                        fill = COLORS[curValue % COLORS.length];
                                    } else {
                                        fill = colorScale ? colorScale(curValue) : "#EEE";
                                    }
                                }

                                return (
                                    <Tooltip
                                        key={geo.rsmKey}
                                        label={`${geo.properties.name}: ${dataPoint?.label || 'N/A'}`}
                                        events={{ hover: true, focus: true, touch: true }}
                                    >
                                        <Geography
                                            geography={geo}
                                            fill={fill}
                                            stroke="#D6D6DA"
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#F53", outline: "none" },
                                                pressed: { outline: "none" },
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })
                    }
                </Geographies>
            </ComposableMap>
        </Paper>
    );
};

export default MapChart;
