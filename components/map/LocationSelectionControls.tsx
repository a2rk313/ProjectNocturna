'use client';

import { useState } from 'react';
import { MapPin, Square, LocateFixed, X } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

interface LocationSelectionControlsProps {
  onSelectionChange: (selection: { type: 'gps' | 'marker' | 'polygon'; coordinates?: [number, number] | [number, number][] }) => void;
}

export default function LocationSelectionControls({ onSelectionChange }: LocationSelectionControlsProps) {
  const { selectionMode, setSelectionMode } = useSelection();
  const [activeTool, setActiveTool] = useState<'gps' | 'marker' | 'polygon' | null>(null);

  const handleGPSSelection = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          onSelectionChange({ type: 'gps', coordinates: coords });
          setActiveTool('gps');
        },
        (error) => {
          console.error("Error getting GPS location:", error);
          alert("Could not retrieve GPS location. Please enable location services.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleMarkerSelection = () => {
    setSelectionMode('point');
    setActiveTool('marker');
    onSelectionChange({ type: 'marker' });
  };

  const handlePolygonSelection = () => {
    setSelectionMode('polygon');
    setActiveTool('polygon');
    onSelectionChange({ type: 'polygon' });
  };

  const handleCancel = () => {
    setSelectionMode('none');
    setActiveTool(null);
    onSelectionChange({ type: 'marker', coordinates: undefined }); // Reset coordinates
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-nocturna-dark/80 rounded-lg border border-nocturna-accent/20 shadow-lg">
      <div className="text-xs text-nocturna-light/70 mb-1">Location Selection</div>
      
      <div className="flex flex-wrap gap-1">
        <button
          onClick={handleGPSSelection}
          className={`p-2 rounded-md transition-colors flex items-center gap-1 text-xs ${
            activeTool === 'gps'
              ? 'bg-nocturna-accent text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
          }`}
          title="Use GPS Location"
        >
          <LocateFixed className="w-3 h-3" />
          GPS
        </button>
        
        <button
          onClick={handleMarkerSelection}
          className={`p-2 rounded-md transition-colors flex items-center gap-1 text-xs ${
            activeTool === 'marker'
              ? 'bg-nocturna-accent text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
          }`}
          title="Select Point"
        >
          <MapPin className="w-3 h-3" />
          Marker
        </button>
        
        <button
          onClick={handlePolygonSelection}
          className={`p-2 rounded-md transition-colors flex items-center gap-1 text-xs ${
            activeTool === 'polygon'
              ? 'bg-nocturna-accent text-white'
              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
          }`}
          title="Select Area"
        >
          <Square className="w-3 h-3" />
          Polygon
        </button>
        
        {activeTool && (
          <button
            onClick={handleCancel}
            className="p-2 rounded-md bg-red-600/80 text-white hover:bg-red-600/90 transition-colors flex items-center gap-1 text-xs"
            title="Cancel Selection"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>
      
      {activeTool && (
        <div className="text-xs text-nocturna-light/60 mt-1">
          {activeTool === 'gps' && 'Using GPS location'}
          {activeTool === 'marker' && 'Click on map to place marker'}
          {activeTool === 'polygon' && 'Click on map to draw polygon'}
        </div>
      )}
    </div>
  );
}