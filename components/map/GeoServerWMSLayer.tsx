'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface GeoServerWMSLayerProps {
  url: string;
  layers: string;
  format?: string;
  transparent?: boolean;
  opacity?: number;
  styles?: string; // Add support for different visualization styles
  time?: string; // Add support for temporal queries
  elevation?: string; // Add support for elevation queries
  cql_filter?: string; // Add support for CQL filters
}

export default function GeoServerWMSLayer({
  url,
  layers,
  format = 'image/png',
  transparent = true,
  opacity = 0.7,
  styles, // New prop for visualization styles
  time, // New prop for temporal filtering
  elevation, // New prop for elevation filtering
  cql_filter, // New prop for CQL filtering
}: GeoServerWMSLayerProps) {
  const map = useMap();

  useEffect(() => {
    // Build WMS parameters with additional options
    const wmsParams: L.WMSOptions = {
      layers,
      format,
      transparent,
      opacity,
      version: '1.1.0',
      crs: L.CRS.EPSG4326,
    };

    // Add optional parameters if provided
    if (styles) wmsParams.styles = styles;
    if (time) (wmsParams as any).time = time;
    if (elevation) (wmsParams as any).elevation = elevation;
    if (cql_filter) (wmsParams as any).cql_filter = cql_filter;

    const wmsLayer = L.tileLayer.wms(url, wmsParams);

    wmsLayer.addTo(map);

    return () => {
      if (map.hasLayer(wmsLayer)) {
        map.removeLayer(wmsLayer);
      }
    };
  }, [map, url, layers, format, transparent, opacity, styles, time, elevation, cql_filter]);

  return null;
}
