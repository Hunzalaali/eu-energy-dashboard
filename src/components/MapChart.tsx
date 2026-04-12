import React, { useMemo, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { type ClusteredData, getMetricLabel } from "../services/analysis";
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

const ISO_TO_NAME: { [key: string]: string } = Object.fromEntries(
    Object.entries(NAME_TO_ISO).map(([k, v]) => [v, k])
);

const METRIC_COLORS = [
    "#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6",
    "#4292c6", "#2171b5", "#08519c", "#08306b"
];

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
        const scale = scaleQuantize<string>().domain([minVal, maxVal]).range(METRIC_COLORS);
        return { colorScale: scale, min: minVal, max: maxVal };
    }, [data, metric, mode]);

    const dataMap = useMemo(() => {
        const map = new Map<string, { value: number; label: string; cluster: number; country: string }>();
        data.forEach((d) => {
            const entry = {
                value: mode === 'cluster' ? d.cluster : (Number(d[metric]) || 0),
                label: mode === 'cluster' ? `Cluster ${d.cluster}` : Number(d[metric])?.toFixed(2),
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
                            <Text size="xs">{min.toFixed(1)}</Text>
                            <div style={{
                                width: 80, height: 10,
                                background: `linear-gradient(to right, ${METRIC_COLORS.join(', ')})`,
                                borderRadius: 4,
                            }} />
                            <Text size="xs">{max.toFixed(1)}</Text>
                        </Group>
                    )}
                </div>
            )}

            {/* Selected country info overlay */}
            {selectedCountry && dataMap.get(selectedCountry) && (
                <div style={{
                    position: 'absolute', bottom: 8, left: 8, zIndex: 10,
                    background: 'rgba(255,255,255,0.95)', borderRadius: 8,
                    padding: '6px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    border: '1px solid #e9ecef',
                }}>
                    <Text size="xs" fw={700} c="blue">
                        {selectedCountry} — {dataMap.get(selectedCountry)?.label}
                    </Text>
                </div>
            )}

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{ center: [15, 52], scale: 650 }}
                // height='100%'
                style={{ width: '100%', height: '100vh' }}
            >
                <ZoomableGroup zoom={1} center={[15, 52]}>
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
                                            label={isEU ? `${iso}: ${dataPoint?.label}` : geo.properties.name}
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
