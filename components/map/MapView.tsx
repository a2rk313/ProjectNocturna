'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import GeoServerWMSLayer from './GeoServerWMSLayer';
import Chatbot from '../chatbot/Chatbot';
import MapInitializer from './MapInitializer';
import DarkSkyParksLayer from './DarkSkyParksLayer';
import LocationSelector from './LocationSelector';
import MapActionControls from './MapActionControls';
import SystemStatus from './SystemStatus';
import { useSelection } from '@/context/SelectionContext';
import { useSearchParams } from 'next/navigation';
import BasemapSwitcher, { BASEMAP_OPTIONS } from './BasemapSwitcher';
import LocationSelectionControls from './LocationSelectionControls';

const DEFAULT_CENTER: [number, number] = [30.3753, 69.3451]; // Pakistan
const DEFAULT_ZOOM = 5;

function MapBoundsUpdater({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) {
  const map = useMap();

  useEffect(() => {
    const updateBounds = () => {
      onBoundsChange(map.getBounds());
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    updateBounds(); // Initial bounds

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map, onBoundsChange]);

  return null;
}

interface MapViewProps {
  viirsVisible?: boolean;
  viirsOpacity?: number;
  viirsStyle?: string; // Add style prop
}

export default function MapView({
  viirsVisible = true,
  viirsOpacity = 0.7,
  viirsStyle = 'viirs_radiance' // Default style
}: MapViewProps) {
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const { setSelectedPoint, setSelectedArea, selectionMode, setSelectionMode } = useSelection();
  const [params, setParams] = useSearchParams();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Custom Basemap State
  const [activeBasemap, setActiveBasemap] = useState('dark');
  const selectedBasemap = BASEMAP_OPTIONS.find(b => b.id === activeBasemap) || BASEMAP_OPTIONS[0];

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSelection = (selection: { type: 'point' | 'polygon'; coordinates: [number, number] | [number, number][] }) => {
    if (selection.type === 'point') {
      const coords = selection.coordinates as [number, number];
      setSelectedPoint(coords);
      showFeedback(`Location selected: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
    } else if (selection.type === 'polygon') {
      setSelectedArea(selection.coordinates as [number, number][]);
      showFeedback('Area captured successfully');
    }
  };

  return (
    <div className="relative w-full h-full">
      <SystemStatus />
      <MapInitializer />
      <MapActionControls drawMode={selectionMode} setDrawMode={setSelectionMode} />
      <BasemapSwitcher currentBasemap={activeBasemap} onBasemapChange={setActiveBasemap} />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          key={activeBasemap}
          attribution={selectedBasemap.attribution}
          url={selectedBasemap.url}
        />

        <LayersControl position="bottomright">

          <LayersControl.Overlay checked name="Dark Sky Parks">
            <DarkSkyParksLayer />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="VIIRS Night Lights">
            <LayerGroup>
              {viirsVisible && (
                <GeoServerWMSLayer
                  url="/geoserver/nocturna/wms"
                  layers="nocturna:VIIRS_Night_Lights_2023"
                  format="image/png"
                  transparent={true}
                  opacity={viirsOpacity}
                  styles={viirsStyle} // Use dynamic style
                />
              )}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Ground Measurement Heatmap">
            <GeoServerWMSLayer
              url="/geoserver/nocturna/wms"
              layers="nocturna:light_measurements"
              format="image/png"
              transparent={true}
              opacity={0.6}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <LocationSelector mode={selectionMode} onSelectionChange={handleSelection} />
        <MapBoundsUpdater onBoundsChange={setMapBounds} />
      </MapContainer>

      <div className="absolute top-40 right-4 z-[1000]">
        <LocationSelectionControls
          onSelectionChange={(selection) => {
            if (selection.type === 'gps' && selection.coordinates) {
              setSelectedPoint(selection.coordinates);
              showFeedback(`GPS Location acquired: ${selection.coordinates[0].toFixed(5)}, ${selection.coordinates[1].toFixed(5)}`);
            } else if (selection.type === 'marker' && selection.coordinates) {
              setSelectedPoint(selection.coordinates as [number, number]);
            } else if (selection.type === 'polygon') {
              // Polygon selection is handled by the LocationSelector component
            }
          }}
        />
      </div>

      {feedbackMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000] bg-emerald-600/90 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
          {feedbackMessage}
        </div>
      )}

      <Chatbot mapBounds={mapBounds} />
    </div>
  );
}
