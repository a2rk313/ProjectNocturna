'use client';

import { Layers, MapPin } from 'lucide-react';

interface MapControlsProps {
  viirsLayerVisible: boolean;
  onToggleViirsLayer: () => void;
}

export default function MapControls({ viirsLayerVisible, onToggleViirsLayer }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-nocturna-navy/90 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-nocturna-light mb-2">Map Layers</h3>
      
      <button
        onClick={onToggleViirsLayer}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          viirsLayerVisible
            ? 'bg-nocturna-accent text-white'
            : 'bg-nocturna-dark/50 text-nocturna-light hover:bg-nocturna-dark'
        }`}
      >
        <Layers className="w-4 h-4" />
        <span>VIIRS Night Lights</span>
      </button>

      <div className="flex items-center gap-2 px-3 py-2 text-sm text-nocturna-light/70">
        <MapPin className="w-4 h-4" />
        <span>Dark Sky Sites</span>
      </div>
    </div>
  );
}
