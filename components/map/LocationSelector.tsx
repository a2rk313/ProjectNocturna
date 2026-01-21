'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useSelection } from '@/context/SelectionContext';

// Import leaflet-draw
require('leaflet-draw');

interface LocationSelectorProps {
  mode: 'none' | 'point' | 'polygon';
  onSelectionChange: (selection: { type: 'point' | 'polygon'; coordinates: [number, number] | [number, number][] }) => void;
}

export default function LocationSelector({ mode, onSelectionChange }: LocationSelectorProps) {
  const map = useMap();
  const drawingRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);

  const { selectedPoint, setSelectedPoint, selectedArea, setSelectedArea } = useSelection();

  useEffect(() => {
    // Initialize drawn items layer
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new (L as any).FeatureGroup();
      map.addLayer(drawnItemsRef.current);
    }

    // Clear previous drawings
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }

    // Add existing selections to the map
    if (selectedPoint) {
      const marker = L.marker([selectedPoint[0], selectedPoint[1]]).addTo(drawnItemsRef.current);
    }

    if (selectedArea && selectedArea.length > 0) {
      const polygon = L.polygon(selectedArea).addTo(drawnItemsRef.current);
    }

    return () => {
      // Cleanup
      if (drawingRef.current) {
        map.removeLayer(drawingRef.current);
      }
    };
  }, [map, selectedPoint, selectedArea]);

  useEffect(() => {
    // Handle drawing mode changes
    if (drawingRef.current) {
      map.removeLayer(drawingRef.current);
      drawingRef.current = null;
    }

    if (mode === 'point') {
      // Point selection mode - show crosshair cursor
      map.getContainer().style.cursor = 'crosshair';

      // Add click event listener for point selection
      const handleClick = (e: L.LeafletMouseEvent) => {
        const coords: [number, number] = [e.latlng.lat, e.latlng.lng];
        onSelectionChange({ type: 'point', coordinates: coords });
        setSelectedPoint(coords);
      };

      map.on('click', handleClick);

      return () => {
        map.getContainer().style.cursor = '';
        map.off('click', handleClick);
      };
    } else if (mode === 'polygon') {
      // Polygon selection mode - initialize drawing
      map.getContainer().style.cursor = 'crosshair';

      // Create drawing control
      const drawControl = new (L as any).Control.Draw({
        position: 'topright',
        draw: {
          polyline: false,
          circle: false,
          circlemarker: false,
          rectangle: false,
          marker: false,
          polygon: {
            allowIntersection: false,
            drawError: {
              color: '#e1e100',
              message: '<strong>Error!<strong> you can\'t draw that!'
            },
            shapeOptions: {
              color: '#97009c'
            }
          }
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true
        }
      });

      drawControl.addTo(map);

      // Event listeners for drawing
      const onDrawCreated = (e: any) => {
        const layer = e.layer;
        drawnItemsRef.current.addLayer(layer);

        if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
          const latLngsArray = layer.getLatLngs()[0] as L.LatLng[] | L.LatLng;

          let coordinates: [number, number][];
          if (Array.isArray(latLngsArray)) {
            coordinates = latLngsArray.map((latLng: L.LatLng) => [latLng.lat, latLng.lng]) as [number, number][];
          } else {
            // Single LatLng case (though this shouldn't happen with polygons)
            coordinates = [[latLngsArray.lat, latLngsArray.lng]] as [number, number][];
          }

          onSelectionChange({ type: 'polygon', coordinates });
          setSelectedArea(coordinates);
        }
      };

      const onDrawEdited = (e: any) => {
        const layers = e.layers;
        layers.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
            const latLngsArray = layer.getLatLngs()[0] as L.LatLng[] | L.LatLng;

            let coordinates: [number, number][];
            if (Array.isArray(latLngsArray)) {
              coordinates = latLngsArray.map((latLng: L.LatLng) => [latLng.lat, latLng.lng]) as [number, number][];
            } else {
              // Single LatLng case (though this shouldn't happen with polygons)
              coordinates = [[latLngsArray.lat, latLngsArray.lng]] as [number, number][];
            }

            onSelectionChange({ type: 'polygon', coordinates });
            setSelectedArea(coordinates);
          }
        });
      };

      map.on('draw:created', onDrawCreated);
      map.on('draw:edited', onDrawEdited);

      drawingRef.current = drawControl;

      return () => {
        map.getContainer().style.cursor = '';
        map.off('draw:created', onDrawCreated);
        map.off('draw:edited', onDrawEdited);
        if (drawingRef.current) {
          map.removeControl(drawingRef.current);
        }
      };
    } else {
      // No selection mode - reset cursor
      map.getContainer().style.cursor = '';
    }
  }, [map, mode, onSelectionChange, setSelectedPoint, setSelectedArea]);

  return null;
}