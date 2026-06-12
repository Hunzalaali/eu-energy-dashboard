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
    'Moderate Renewables': '#20c997', // Teal-green      – above-average renewables, no dominant feature
    'Diversified Mix':     '#868e96', // Muted slate     – below-average renewables, no dominant feature
    'Empty':              '#adb5bd', // Light grey      – empty cluster

    // --- assignClusterNamesZScore names (simple single-feature) ---
    'Green':              '#40c057', // Bright green
    'Low-Renewable':      '#495057', // Dark slate/grey
    'Import-Dependent':   '#e67700', // Amber
    'Self-Sufficient':    '#1c7ed6', // Blue
    'Carbon-Intensive':   '#c92a2a', // Red
    'Low-Carbon':         '#40c057', // Bright green
    'Energy-Intensive':   '#f59f00', // Yellow-amber
    'Efficient':          '#0ca678', // Teal
    'High-Consumption':   '#f76707', // Deep orange
    'Low-Consumption':    '#74c0fc', // Sky blue
    'Fossil-Reliant':     '#7c5c3a', // Brown
    'Post-Fossil':        '#51cf66', // Soft green
    'Nuclear-Powered':    '#7048e8', // Violet

    // --- Composite names: renewables mixed with import dependency ---
    'Imports & Renewables Driven':    '#12b886',
    'Renewables & Imports Driven':    '#12b886',
    'Import-Dependent & Green':       '#12b886',
    'Green & Import-Dependent':       '#12b886',
    'Import & Green':                 '#12b886',
    'Green & Imports':                '#12b886',
    'Renewables & Import-Dependent':  '#12b886',
    'Import-Dependent & Renewables':  '#12b886',
};

/**
 * Keyword-based fallback.  When the name contains a known keyword we return a
 * thematically appropriate colour.  Keywords are checked in priority order.
 */
const KEYWORD_COLORS: Array<{ keywords: string[]; color: string }> = [
    // 0. Catch positive "post-fossil" before it gets snagged by the negative "fossil" rule
    { keywords: ['post-fossil', 'low-carbon'],                                        color: '#2b8a3e' }, // Dark forest green

    // 1. Check for negative/fossil descriptors FIRST so they aren't masked by 'renewable'
    { keywords: ['fossil-reliant', 'fossil dependent', 'low-renewable'],              color: '#868e96' }, // Muted grey/slate
    { keywords: ['carbon', 'carbon-intensive'],                                       color: '#c92a2a' }, // Deep red
    { keywords: ['fossil'],                                                           color: '#7c5c3a' }, // Brown

    // 2. Specific clusters
    { keywords: ['nuclear'],                                                          color: '#7048e8' }, // Violet
    
    // 3. Moderate / Diversified (Make this BLUE instead of green for diversity)
    { keywords: ['moderate renewable', 'moderate-renewable', 'diversified'],           color: '#228be6' }, // Distinct bright blue
    
    // 4. Positive / Green Leaders
    { keywords: ['pioneer', 'leader'],                                                color: '#2b8a3e' }, // Dark forest green
    { keywords: ['renewables & import', 'imports & renew', 'import-dependent & green', 'green & import'], color: '#12b886' },
    { keywords: ['green', 'renewable', 'efficient'],                                  color: '#40c057' }, // Standard green
    
    // 5. Supply chain / Intensity
    { keywords: ['import', 'import-dependent', 'dependency'],                         color: '#e67700' }, // Amber
    { keywords: ['intensity', 'intensive', 'high-consumption', 'consumption'],        color: '#f59f00' }, // Yellow-amber
    { keywords: ['self-sufficient', 'low-consumption'],                               color: '#0ca678' }, // Teal
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
