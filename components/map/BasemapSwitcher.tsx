'use client';

import React from 'react';
import { Layers, Map as MapIcon, Globe, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BasemapOption {
    id: string;
    name: string;
    url: string;
    attribution: string;
    icon: React.ReactNode;
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
    {
        id: 'dark',
        name: 'Dark Matter',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CARTO',
        icon: <Globe className="w-4 h-4" />
    },
    {
        id: 'satellite',
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri',
        icon: <MapIcon className="w-4 h-4" />
    },
    {
        id: 'terrain',
        name: 'Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'OpenTopoMap',
        icon: <MapPin className="w-4 h-4" />
    },
    {
        id: 'light',
        name: 'Street Map',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: 'OpenStreetMap',
        icon: <Layers className="w-4 h-4" />
    }
];

interface BasemapSwitcherProps {
    currentBasemap: string;
    onBasemapChange: (id: string) => void;
}

export default function BasemapSwitcher({ currentBasemap, onBasemapChange }: BasemapSwitcherProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col items-start gap-2">
            <div className={cn(
                "flex flex-col gap-2 transition-all duration-300 origin-bottom-left",
                isOpen ? "scale-100 opacity-100 mb-2" : "scale-75 opacity-0 pointer-events-none mb-0 h-0"
            )}>
                {BASE_OPTIONS_RENDER()}
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-3 rounded-full bg-nocturna-navy/90 border backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95",
                    isOpen ? "border-nocturna-accent text-nocturna-accent" : "border-nocturna-accent/20 text-nocturna-light/80"
                )}
            >
                <Layers className="w-6 h-6" />
            </button>
        </div>
    );

    function BASE_OPTIONS_RENDER() {
        return (
            <div className="flex flex-col gap-2 p-2 rounded-2xl bg-nocturna-navy/90 border border-nocturna-accent/20 backdrop-blur-md shadow-2xl overflow-hidden">
                {BASEMAP_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            onBasemapChange(opt.id);
                            setIsOpen(false);
                        }}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm",
                            currentBasemap === opt.id
                                ? "bg-nocturna-accent text-white shadow-lg"
                                : "text-nocturna-light/70 hover:bg-white/5 hover:text-nocturna-light"
                        )}
                    >
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            currentBasemap === opt.id ? "bg-white/20" : "bg-nocturna-accent/10"
                        )}>
                            {opt.icon}
                        </div>
                        <span className="font-medium">{opt.name}</span>
                    </button>
                ))}
            </div>
        );
    }
}
