import { Stack, Slider, Select, Text, Divider, NavLink } from '@mantine/core';
import { IconMap, IconChartScatter, IconChartDots, IconInfoCircle } from '@tabler/icons-react';
import { getMetricLabel } from '../services/analysis';

interface SidebarControlsProps {
    year: number;
    setYear: (year: number) => void;
    minYear: number;
    maxYear: number;
    metrics: string[];
    metric: string;
    setMetric: (metric: string) => void;
    selectedCountry: string | null;
    setSelectedCountry: (country: string | null) => void;
    countries: string[];
    currentView: string;
    setView: (view: string) => void;
}

export const SidebarControls = ({
    year, setYear, minYear, maxYear,
    metrics, metric, setMetric,
    selectedCountry, setSelectedCountry, countries,
    currentView, setView
}: SidebarControlsProps) => {

    const views = [
        { id: 'map', label: 'Map View', icon: <IconMap size={16} /> },
        { id: 'cluster', label: 'Cluster Analysis', icon: <IconChartScatter size={16} /> },
        { id: 'typologies', label: 'Typologies', icon: <IconChartDots size={16} /> },
        { id: 'timeSeries', label: 'Time Series', icon: <IconChartDots size={16} /> },
        { id: 'methodology', label: 'Methodology', icon: <IconInfoCircle size={16} /> },
    ];

    return (
        <Stack p="md" gap="lg">

            <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Navigation</Text>
                {views.map((v) => (
                    <NavLink
                        key={v.id}
                        label={v.label}
                        leftSection={v.icon}
                        active={currentView === v.id}
                        onClick={() => setView(v.id)}
                        variant="filled"
                        color="blue"
                        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                    />
                ))}
            </Stack>

            <Divider />

            <Stack gap="xs">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Global Controls</Text>

                {/* Year Slider */}
                <Stack gap={4}>
                    <Text size="sm" fw={500}>Year: {year}</Text>
                    <Slider
                        min={minYear}
                        max={maxYear}
                        value={year}
                        onChange={setYear}
                        step={1}
                        marks={[
                            { value: minYear, label: minYear.toString() },
                            { value: maxYear, label: maxYear.toString() },
                        ]}
                    />
                </Stack>

                {/* Country Selector */}
                <Select
                    label="Highlight Country"
                    placeholder="Select Country"
                    data={countries}
                    value={selectedCountry}
                    onChange={setSelectedCountry}
                    searchable
                    clearable
                />

                {/* Metric Selector - relevant for Map and Time Series */}
                <Select
                    label="Metric"
                    placeholder="Select Metric"
                    data={metrics.map(m => ({ value: m, label: getMetricLabel(m) }))}
                    value={metric}
                    onChange={(v) => setMetric(v || metrics[0])}
                />
            </Stack>
        </Stack>
    );
};
