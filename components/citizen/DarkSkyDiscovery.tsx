'use client';

import { useState, useEffect } from 'react';
import { bortleClassDescription } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

export default function DarkSkyDiscovery() {
    const [radiusKm, setRadiusKm] = useState(50);
    const [loading, setLoading] = useState(false);
    const [sites, setSites] = useState<any[]>([]);

    const { selectedPoint } = useSelection();

    useEffect(() => {
        if (selectedPoint) {
            searchSites();
        }
    }, [selectedPoint]);

    async function searchSites() {
        if (!selectedPoint) return;
        setLoading(true);
        try {
            const [lat, lon] = selectedPoint;
            const res = await fetch(`/api/dark-sky-sites?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`);
            const data = await res.json();
            setSites(data.sites || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="space-y-4">
            <div className="text-sm text-nocturna-light/80">
                Find the best stargazing locations near you using VIIRS radiance data and SQM readings.
            </div>

            <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-nocturna-light/70">Radius (km)</label>
                    <input
                        type="number"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="w-full bg-nocturna-dark/50 text-nocturna-light rounded-md px-3 py-2 text-sm border border-nocturna-accent/20"
                    />
                </div>
                <button
                    onClick={searchSites}
                    disabled={loading}
                    className="bg-nocturna-accent hover:bg-nocturna-accent/90 text-white rounded-md px-4 py-2 text-sm flex items-center gap-2 mb-[1px]"
                >
                    {loading ? 'Searching...' : <><Search className="w-4 h-4" /> Find Sites</>}
                </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sites.length === 0 && !loading && (
                    <div className="text-xs text-nocturna-light/50 text-center py-4">
                        No sites found yet. Try searching.
                    </div>
                )}

                {sites.map((site) => (
                    <div key={site.id} className="rounded-lg bg-nocturna-dark/40 border border-nocturna-accent/10 p-3 hover:bg-nocturna-dark/60 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-semibold text-nocturna-light">{site.name}</div>
                                <div className="text-xs text-nocturna-light/60">
                                    {site.distance_km.toFixed(1)} km • {site.type === 'park' ? 'Dark Sky Park' : 'SQM Measurement'}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono text-emerald-400">
                                    SQM {site.sqm?.toFixed(2) || 'N/A'}
                                </div>
                                <div className="text-[10px] text-nocturna-light/50">
                                    Bortle {site.bortle}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-[10px] text-nocturna-light/40 border-t border-nocturna-accent/10 pt-2">
                * Estimates based on VNP46A2 & SQM Network
            </div>
        </section>
    );
}
