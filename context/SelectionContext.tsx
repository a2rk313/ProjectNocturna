'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectionContextType {
    selectedPoint: [number, number] | null;
    setSelectedPoint: (point: [number, number] | null) => void;
    selectedArea: [number, number][] | null;
    setSelectedArea: (area: [number, number][] | null) => void;
    selectionMode: 'none' | 'point' | 'polygon';
    setSelectionMode: (mode: 'none' | 'point' | 'polygon') => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
    const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
    const [selectedArea, setSelectedArea] = useState<[number, number][] | null>(null);
    const [selectionMode, setSelectionMode] = useState<'none' | 'point' | 'polygon'>('none');

    return (
        <SelectionContext.Provider value={{
            selectedPoint, setSelectedPoint,
            selectedArea, setSelectedArea,
            selectionMode, setSelectionMode
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
