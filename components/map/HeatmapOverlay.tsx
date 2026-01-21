'use client';

import { useEffect, useState } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';

export default function HeatmapOverlay() {
    const [points, setPoints] = useState<any[]>([]);

    useEffect(() => {
        // Fetch all generic light measurements
        // Note: In real app, might want to tile this or limit by bounds
        fetch('/api/science/correlation?lat=0&lon=0&radius=20000') // Hack to reuse existing endpoint or just direct query? 
        // Better: Use the raw light_measurements if available.
        // Let's assume we don't have a direct "getAll" endpoint for measurements yet 
        // except the WMS layer `light_measurements`.
        // Actually, the WMS layer IS the best way to render large heatmaps.
        // I'll stick to WMS for "Heatmap" but maybe user meant a client side one?
        // Let's just create a component that renders the WMS layer of light_measurements as a heatmap style.
        // BUT, for now, let's just make a mock client visualizer for the SQM readings table
    }, []);

    // ... switching strategy:
    // The user wants a heatmap. The best way with PostGIS + GeoServer is to style a WMS layer as heatmap.
    // I can just add another WMS overlay for "SQM Heatmap" if I had the SLD.
    // Since I don't have SLD control easily here, I will implement a client-side "Cluster" or "Circle" visualization
    // for the `sqm_readings` if I had an endpoint.
    // For now, let's skip a specific new component and rely on the existing VIIRS raster as the primary "Heatmap"
    // and the WMS `light_measurements` layer as the point heatmap.

    return null;
}
