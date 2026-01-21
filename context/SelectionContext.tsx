'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MapCommand =
  | { type: 'flyTo'; center: [number, number]; zoom?: number }
  | { type: 'setLayer'; layer: string; visible: boolean };

interface SelectionContextType {
    selectedPoint: [number, number] | null;
    setSelectedPoint: (point: [number, number] | null) => void;
    selectedArea: [number, number][] | null;
    setSelectedArea: (area: [number, number][] | null) => void;
    selectionMode: 'none' | 'point' | 'polygon';
    setSelectionMode: (mode: 'none' | 'point' | 'polygon') => void;
    mapCommand: MapCommand | null;
    executeMapCommand: (cmd: MapCommand | null) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
    const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
    const [selectedArea, setSelectedArea] = useState<[number, number][] | null>(null);
    const [selectionMode, setSelectionMode] = useState<'none' | 'point' | 'polygon'>('none');
    const [mapCommand, setMapCommand] = useState<MapCommand | null>(null);

    const executeMapCommand = (cmd: MapCommand | null) => {
        setMapCommand(cmd);
        // Reset command after short delay to allow re-triggering same command if needed
        if (cmd) {
            setTimeout(() => setMapCommand(null), 100);
        }
    };

    return (
        <SelectionContext.Provider value={{
            selectedPoint, setSelectedPoint,
            selectedArea, setSelectedArea,
            selectionMode, setSelectionMode,
            mapCommand, executeMapCommand
        }}>
            {children}
        </SelectionContext.Provider>
    );
}

export function useSelection() {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
}
