'use client';

import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Shield } from 'lucide-react';

// Custom icon for parks (using a simple divIcon or standard Leaflet icon for now)
const parkIcon = L.icon({
    iconUrl: '/images/marker-icon-2x-green.png',
    shadowUrl: '/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

export default function DarkSkyParksLayer() {
    const [parks, setParks] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/parks')
            .then(res => res.json())
            .then(data => {
                // The API returns { success: true, data: [...] }
                const parksList = data.success ? data.data || [] : [];
                setParks(parksList);
            })
            .catch(err => console.error('Failed to load parks:', err));
    }, []);

    return (
        <>
            {parks.map((park, i) => {
                // The API returns parks in a flat format with lat/lon fields
                // Convert to Leaflet format [lat, lon]
                const position: [number, number] = [park.lat, park.lon];

                return (
                    <Marker key={i} position={position} icon={parkIcon}>
                        <Popup className="nocturna-popup">
                            <div className="text-sm">
                                <div className="font-bold flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-emerald-600" />
                                    {park.name}
                                </div>
                                <div className="text-xs text-slate-500">{park.designation}</div>
                                {park.sqm && (
                                    <div className="text-xs mt-1">
                                        SQM: <b>{park.sqm}</b>
                                    </div>
                                )}
                                {park.bortle && (
                                    <div className="text-xs">
                                        Bortle: <b>{park.bortle}</b>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </>
    );
}
