/**
 * Predefined, semantically meaningful colors for each cluster name.
 *
 * Colors are chosen to be:
 *  - Thematically appropriate (green = renewables, red = carbon-heavy, etc.)
 *  - Visually distinct from one another
 *  - Consistent across all charts and views in the dashboard
 *
 * The matching is keyword-based so it works for both the heuristic names
 * (e.g. "Green Pioneers") and the z-score composite names (e.g. "Green & Efficient").
 */

/** Exact-match colour map — checked first */
const EXACT_COLORS: Record<string, string> = {
    // --- assignClusterNames names ---
    'Green Pioneers':     '#2f9e44', // Forest green  – high renewables
    'Nuclear Core':       '#7048e8', // Violet         – nuclear-dominated
    'Fossil Dependent':   '#7c5c3a', // Brown           – heavy fossil use
    'Import Dependent':   '#e67700', // Amber/orange   – energy dependency
    'Carbon Intensive':   '#c92a2a', // Deep red        – high GHG intensity
    'High Intensity':     '#f59f00', // Yellow-amber    – high energy intensity
    'Mixed Profile':      '#495057', // Dark slate      – no clear signal
    'Empty':              '#adb5bd', // Light grey      – empty cluster

    // --- assignClusterNamesZScore names (simple single-feature) ---
    'Green':              '#40c057', // Bright green
    'Low-Renewable':      '#868e96', // Muted grey
    'Import-Dependent':   '#e67700', // Amber (same as Import Dependent)
    'Self-Sufficient':    '#1c7ed6', // Blue            – energy independence
    'Carbon-Intensive':   '#c92a2a', // Same as Carbon Intensive
    'Low-Carbon':         '#2f9e44', // Same as Green Pioneers
    'Energy-Intensive':   '#f59f00', // Same as High Intensity
    'Efficient':          '#0ca678', // Teal            – energy efficient
    'High-Consumption':   '#f76707', // Deep orange
    'Low-Consumption':    '#74c0fc', // Sky blue
    'Fossil-Reliant':     '#7c5c3a', // Brown (same as Fossil Dependent)
    'Post-Fossil':        '#51cf66', // Soft green
    'Nuclear-Powered':    '#7048e8', // Violet (same as Nuclear Core)
};

/**
 * Keyword-based fallback.  When the name contains a known keyword we return a
 * thematically appropriate colour.  Keywords are checked in priority order.
 */
const KEYWORD_COLORS: Array<{ keywords: string[]; color: string }> = [
    { keywords: ['green', 'pioneer', 'renewable', 'post-fossil', 'low-carbon', 'efficient'], color: '#2f9e44' },
    { keywords: ['nuclear'],                                                                  color: '#7048e8' },
    { keywords: ['fossil', 'fossil-reliant'],                                                 color: '#7c5c3a' },
    { keywords: ['carbon', 'carbon-intensive'],                                               color: '#c92a2a' },
    { keywords: ['import', 'import-dependent', 'dependency'],                                 color: '#e67700' },
    { keywords: ['intensity', 'intensive', 'high-consumption', 'consumption'],                color: '#f59f00' },
    { keywords: ['self-sufficient', 'low-consumption', 'efficient'],                          color: '#0ca678' },
];

/** Fallback palette for any cluster names that don't match any rule. */
const FALLBACK_PALETTE = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300',
    '#0088fe', '#00C49F', '#FFBB28', '#FF8042',
];

/**
 * Returns the predefined colour for a given cluster name.
 *
 * Resolution order:
 *  1. Exact match (case-insensitive)
 *  2. Keyword match in the name
 *  3. Index-based fallback from FALLBACK_PALETTE
 *
 * @param clusterName  The display name of the cluster (from assignClusterNames / assignClusterNamesZScore)
 * @param fallbackIndex  Optional numeric index used as a last-resort palette lookup
 */
export const getClusterColor = (clusterName: string | undefined, fallbackIndex = 0): string => {
    if (!clusterName) return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];

    // 1. Exact match (case-insensitive)
    const exactKey = Object.keys(EXACT_COLORS).find(
        key => key.toLowerCase() === clusterName.toLowerCase()
    );
    if (exactKey) return EXACT_COLORS[exactKey];

    // 2. Keyword match
    const lowerName = clusterName.toLowerCase();
    for (const { keywords, color } of KEYWORD_COLORS) {
        if (keywords.some(kw => lowerName.includes(kw))) {
            return color;
        }
    }

    // 3. Fallback
    return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
};

/**
 * Convenience helper: given the `clusterNames` record (clusterId → name) and a
 * cluster ID, return the appropriate colour.
 */
export const getClusterColorById = (
    clusterId: number,
    clusterNames?: Record<number, string>
): string => {
    const name = clusterNames?.[clusterId];
    return getClusterColor(name, clusterId);
};

export { FALLBACK_PALETTE };
