import React, { useMemo, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { type ClusteredData } from "../services/analysis";
import { Tooltip, Text, Group, Badge } from "@mantine/core";
import { useInteraction } from "../context/InteractionContext";
import { getClusterColorById } from "../utils/clusterColors";

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


const NAME_TO_ISO: { [key: string]: string } = {
    "Austria": "AT", "Belgium": "BE", "Bulgaria": "BG", "Cyprus": "CY",
    "Czech Rep.": "CZ", "Germany": "DE", "Denmark": "DK", "Estonia": "EE",
    "Greece": "EL", "Spain": "ES", "Finland": "FI", "France": "FR",
    "Croatia": "HR", "Hungary": "HU", "Ireland": "IE", "Italy": "IT",
    "Lithuania": "LT", "Luxembourg": "LU", "Latvia": "LV", "Malta": "MT",
    "Netherlands": "NL", "Poland": "PL", "Portugal": "PT", "Romania": "RO",
    "Sweden": "SE", "Slovenia": "SI", "Slovakia": "SK",
};

export const ISO_TO_NAME: { [key: string]: string } = Object.fromEntries(
    Object.entries(NAME_TO_ISO).map(([k, v]) => [v, k])
);

export const formatCountryName = (iso: string | null | undefined): string => {
    if (!iso) return '';
    if (iso === 'EU-27' || iso === 'EU') return `European Union (${iso})`;
    const name = ISO_TO_NAME[iso];
    return name ? `${name} (${iso})` : iso;
};

const COLOR_SCALES: Record<string, string[]> = {
    blue: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
    green: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"],
    red: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"],
    purple: ["#fcfbfd", "#efedf5", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#54278f", "#3f007d"],
    orange: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#a63603", "#7f2704"],
};

const getMetricColorScale = (metric: string): string[] => {
    if (metric.includes('renewable')) return COLOR_SCALES.green;
    if (metric.includes('ghg') || metric.includes('fossil') || metric.includes('intensity') || metric.includes('capita')) return COLOR_SCALES.red;
    if (metric.includes('nuclear')) return COLOR_SCALES.purple;
    if (metric.includes('dependency')) return COLOR_SCALES.orange;
    return COLOR_SCALES.blue;
};

const formatMetricValue = (val: number | undefined): string => {
    if (val === undefined || isNaN(val)) return "0";
    if (val === 0) return "0";
    const abs = Math.abs(val);
    if (abs < 0.01) return val.toFixed(4);
    if (abs < 0.1) return val.toFixed(3);
    if (abs < 1) return val.toFixed(2);
    return val.toFixed(1);
};

interface MapChartProps {
    data: ClusteredData[];
    metric: string;
    mode?: 'metric' | 'cluster';
    // height?: any;
    showLegend?: boolean;
    clusterNames?: Record<number, string>;
}

const MapChart: React.FC<MapChartProps> = ({
    data, metric, mode = 'cluster',
    showLegend = true, clusterNames,
}) => {
    const {
        hoveredCountry, selectedCountry, selectedCluster,
        setHoveredCountry, toggleCountry, toggleCluster,
    } = useInteraction();

    const { colorScale, min, max } = useMemo(() => {
        if (mode === 'cluster') return { colorScale: null, min: 0, max: 0 };
        const values = data.map((d) => Number(d[metric]) || 0);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const scale = scaleQuantize<string>().domain([minVal, maxVal]).range(getMetricColorScale(metric));
        return { colorScale: scale, min: minVal, max: maxVal };
    }, [data, metric, mode]);

    const dataMap = useMemo(() => {
        const map = new Map<string, { value: number; label: string; cluster: number; country: string }>();
        data.forEach((d) => {
            const entry = {
                value: mode === 'cluster' ? d.cluster : (Number(d[metric]) || 0),
                label: mode === 'cluster' ? `Cluster ${d.cluster}` : formatMetricValue(Number(d[metric]) || 0),
                cluster: d.cluster,
                country: d.country,
            };
            map.set(d.country, entry);
            // Also map by geo name
            const geoName = ISO_TO_NAME[d.country];
            if (geoName) map.set(geoName, entry);
        });
        return map;
    }, [data, metric, mode]);

    const handleCountryHover = useCallback((iso: string | null) => {
        setHoveredCountry(iso);
    }, [setHoveredCountry]);

    const handleCountryClick = useCallback((iso: string) => {
        toggleCountry(iso);
    }, [toggleCountry]);

    const clusters = useMemo(() =>
        Array.from(new Set(data.map(d => d.cluster))).filter(c => c !== undefined).sort((a, b) => a - b),
        [data]
    );

    return (
        <div style={{ position: 'relative', height: "100%" }}>
            {/* Legend overlay */}
            {showLegend && (
                <div style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 10,
                    background: 'rgba(255,255,255,0.92)', borderRadius: 8,
                    padding: '8px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}>
                    {mode === 'cluster' && (
                        <Group gap={6} wrap="wrap">
                            {clusters.map(c => (
                                <Badge
                                    key={c}
                                    size="sm"
                                    color={selectedCluster === c ? 'blue' : 'gray'}
                                    variant={selectedCluster === c ? 'filled' : 'light'}
                                    leftSection={
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            backgroundColor: getClusterColorById(c, clusterNames),
                                        }} />
                                    }
                                    onClick={() => toggleCluster(c)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {clusterNames?.[c] || `C${c}`}
                                </Badge>
                            ))}
                        </Group>
                    )}
                    {mode === 'metric' && (
                        <Group gap={6}>
                            <Text size="xs">{formatMetricValue(min)}</Text>
                            <div style={{
                                width: 80, height: 10,
                                background: `linear-gradient(to right, ${getMetricColorScale(metric).join(', ')})`,
                                borderRadius: 4,
                            }} />
                            <Text size="xs">{formatMetricValue(max)}</Text>
                        </Group>
                    )}
                </div>
            )}

            {selectedCountry && dataMap.get(selectedCountry) && (
                <div style={{
                    position: 'absolute', bottom: 8, left: 8, zIndex: 10,
                    background: 'rgba(255,255,255,0.95)', borderRadius: 8,
                    padding: '6px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    border: '1px solid #e9ecef',
                }}>
                    <Text size="xs" fw={700} c="blue">
                        {ISO_TO_NAME[selectedCountry] || selectedCountry} ({selectedCountry}) — {dataMap.get(selectedCountry)?.label}
                    </Text>
                </div>
            )}

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{ center: [15, 53], scale: 580 }}
                style={{ width: '100%', height: '650px' }}
            >
                <ZoomableGroup zoom={1} center={[15, 53]}>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies
                                .filter((geo) => EUROPE_COUNTRIES.includes(geo.properties.name))
                                .map((geo) => {
                                    const iso = NAME_TO_ISO[geo.properties.name];
                                    const dataPoint = dataMap.get(geo.properties.name);
                                    const curValue = dataPoint?.value;
                                    const isEU = iso && dataPoint;

                                    // Determine fill
                                    let fill = "#EEE";
                                    if (isEU && curValue !== undefined) {
                                        if (mode === 'cluster') {
                                            fill = getClusterColorById(curValue, clusterNames);
                                        } else {
                                            fill = (colorScale ? colorScale(curValue) : "#EEE") || "#EEE";
                                        }
                                    }

                                    // Interaction states
                                    const isHovered = iso === hoveredCountry || geo.properties.name === hoveredCountry;
                                    const isSelected = iso === selectedCountry || geo.properties.name === selectedCountry;
                                    const isClusterDimmed = selectedCluster !== null && isEU && dataPoint?.cluster !== selectedCluster;
                                    const isHoverHighlight = hoveredCountry && iso !== hoveredCountry && !isSelected;

                                    // Final opacity
                                    let opacity = 1;
                                    if (isClusterDimmed) opacity = 0.15;
                                    else if (isHoverHighlight && isEU) opacity = 0.5;

                                    return (
                                        <Tooltip
                                            key={geo.rsmKey}
                                            label={isEU ? `${geo.properties.name} (${iso}): ${dataPoint?.label}` : geo.properties.name}
                                            events={{ hover: true, focus: true, touch: true }}
                                        >
                                            <Geography
                                                geography={geo}
                                                style={{
                                                    default: {
                                                        outline: "none",
                                                        fill: isClusterDimmed ? '#e9ecef' : fill,
                                                        stroke: isSelected ? '#e03131' : isHovered ? '#1971c2' : '#fff',
                                                        strokeWidth: isSelected ? 2.5 : isHovered ? 2 : 0.5,
                                                        opacity,
                                                        transition: 'all 0.2s ease',
                                                        filter: isHovered ? 'brightness(1.1)' : 'none',
                                                    },
                                                    hover: {
                                                        outline: "none",
                                                        fill: isClusterDimmed ? '#dee2e6' : fill,
                                                        stroke: '#1971c2',
                                                        strokeWidth: 2,
                                                        cursor: isEU ? 'pointer' : 'default',
                                                        filter: 'brightness(1.15)',
                                                    },
                                                    pressed: { outline: "none", fill: "#E42" },
                                                }}
                                                onMouseEnter={() => iso && handleCountryHover(iso)}
                                                onMouseLeave={() => handleCountryHover(null)}
                                                onClick={() => iso && handleCountryClick(iso)}
                                            />
                                        </Tooltip>
                                    );
                                })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
};

export default MapChart;
