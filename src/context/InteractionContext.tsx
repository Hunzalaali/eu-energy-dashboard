import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * Interaction Context — Shared state for Coordinated Multiple Views (CMV)
 * 
 * This implements the brushing & linking pattern described by:
 *   Roberts, J.C. (2007). "State of the Art: Coordinated & Multiple Views." CMV '07.
 * 
 * Any chart can write to this context (e.g., hovering a country on the map),
 * and all other charts read from it to update their visual state accordingly.
 */

export interface InteractionState {
    /** Currently hovered country ISO code (null = no hover) */
    hoveredCountry: string | null;
    /** Currently selected country ISO code (null = no selection) */
    selectedCountry: string | null;
    /** Currently selected cluster ID (null = show all) */
    selectedCluster: number | null;
    /** Currently hovered cluster ID */
    hoveredCluster: number | null;
}

interface InteractionContextType extends InteractionState {
    setHoveredCountry: (country: string | null) => void;
    setSelectedCountry: (country: string | null) => void;
    setSelectedCluster: (cluster: number | null) => void;
    setHoveredCluster: (cluster: number | null) => void;
    /** Toggle country selection (click same country deselects) */
    toggleCountry: (country: string) => void;
    /** Toggle cluster selection */
    toggleCluster: (cluster: number) => void;
    /** Reset all selections */
    resetAll: () => void;
}

const defaultState: InteractionState = {
    hoveredCountry: null,
    selectedCountry: null,
    selectedCluster: null,
    hoveredCluster: null,
};

const InteractionContext = createContext<InteractionContextType>({
    ...defaultState,
    setHoveredCountry: () => {},
    setSelectedCountry: () => {},
    setSelectedCluster: () => {},
    setHoveredCluster: () => {},
    toggleCountry: () => {},
    toggleCluster: () => {},
    resetAll: () => {},
});

export const InteractionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<InteractionState>(defaultState);

    const setHoveredCountry = useCallback((country: string | null) => {
        setState(prev => ({ ...prev, hoveredCountry: country }));
    }, []);

    const setSelectedCountry = useCallback((country: string | null) => {
        setState(prev => ({ ...prev, selectedCountry: country }));
    }, []);

    const setSelectedCluster = useCallback((cluster: number | null) => {
        setState(prev => ({ ...prev, selectedCluster: cluster }));
    }, []);

    const setHoveredCluster = useCallback((cluster: number | null) => {
        setState(prev => ({ ...prev, hoveredCluster: cluster }));
    }, []);

    const toggleCountry = useCallback((country: string) => {
        setState(prev => ({
            ...prev,
            selectedCountry: prev.selectedCountry === country ? null : country,
        }));
    }, []);

    const toggleCluster = useCallback((cluster: number) => {
        setState(prev => ({
            ...prev,
            selectedCluster: prev.selectedCluster === cluster ? null : cluster,
        }));
    }, []);

    const resetAll = useCallback(() => {
        setState(defaultState);
    }, []);

    return (
        <InteractionContext.Provider value={{
            ...state,
            setHoveredCountry,
            setSelectedCountry,
            setSelectedCluster,
            setHoveredCluster,
            toggleCountry,
            toggleCluster,
            resetAll,
        }}>
            {children}
        </InteractionContext.Provider>
    );
};

export const useInteraction = () => useContext(InteractionContext);
