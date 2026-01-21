'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, ExternalLink } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

interface Park {
    id: number;
    name: string;
    country: string;
    designation: string;
    lat: number;
    lon: number;
}

export default function ParksDirectory() {
    const [search, setSearch] = useState('');
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(true);
    const { selectedPoint } = useSelection();
    const location = selectedPoint ? { lat: selectedPoint[0], lon: selectedPoint[1] } : null;

    useEffect(() => {
        async function fetchParks() {
            try {
                // If a location is selected, get nearby parks; otherwise get all parks
                const apiUrl = location
                    ? `/api/parks?lat=${location.lat}&lon=${location.lon}&radius=500&limit=50`
                    : '/api/parks?limit=50';

                const res = await fetch(apiUrl);
                const data = await res.json();
                setParks(data.parks || []);
            } catch (e) {
                console.error("Failed to load parks", e);
            } finally {
                setLoading(false);
            }
        }
        fetchParks();
    }, [location]); // Add location as dependency to refetch when location changes

    const filteredParks = parks.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <section className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nocturna-light/50" />
                <input
                    type="text"
                    placeholder="Search International Dark Sky Parks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-nocturna-dark/50 border border-nocturna-accent/20 rounded-md py-2 pl-9 pr-4 text-sm text-nocturna-light placeholder-nocturna-light/50 focus:outline-none focus:ring-1 focus:ring-nocturna-accent"
                />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {loading && <div className="text-center text-xs text-nocturna-light/50 py-4">Loading directory...</div>}

                {!loading && filteredParks.length === 0 && (
                    <div className="text-center text-xs text-nocturna-light/50 py-4">No parks found.</div>
                )}

                {filteredParks.map((park) => (
                    <div key={park.id} className="p-3 bg-nocturna-dark/30 hover:bg-nocturna-dark/50 rounded-lg border border-transparent hover:border-nocturna-accent/20 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-sm font-medium text-nocturna-light group-hover:text-nocturna-accent transition-colors">{park.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-1.5 py-0.5 rounded-sm bg-nocturna-accent/10 text-nocturna-accent border border-nocturna-accent/20">
                                        {park.designation}
                                    </span>
                                    <span className="text-xs text-nocturna-light/60">{park.country}</span>
                                </div>
                            </div>
                            <button className="text-nocturna-light/40 hover:text-nocturna-accent p-1">
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-nocturna-light/50">
                            <MapPin className="w-3 h-3" />
                            <span>{park.lat.toFixed(2)}, {park.lon.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-center text-[10px] text-nocturna-light/40 pt-2 border-t border-nocturna-accent/10">
                Data verified by DarkSky International (Mock/Seed Data)
            </div>
        </section>
    );
}
