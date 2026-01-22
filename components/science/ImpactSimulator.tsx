'use client';

import { useState } from 'react';
import { Lightbulb, Info, Plus, Trash2 } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

export default function ImpactSimulator() {
    const { selectionMode, setSelectionMode, selectedPoint, mapCommand, executeMapCommand } = useSelection();
    const [lightSources, setLightSources] = useState<Array<{ id: number; lat: number; lon: number; intensity: number; type: string }>>([]);
    const [intensity, setIntensity] = useState(5000); // Lumens
    const [sourceType, setSourceType] = useState('street');

    const handleAddSource = () => {
        setSelectionMode('point');
        // We need to listen for the next selection to add it.
        // For simplicity in this interaction model, we'll assume the user clicks the map AFTER clicking "Add Source".
        // The MapView/LocationSelector updates 'selectedPoint'.
    };

    // Watch for selectedPoint changes to add source
    // Note: In a real app, we'd want a cleaner state machine to distinguish "selecting for analysis" vs "placing light source"
    // For this implementation, we will add a button to "Confirm Placement" at the current selected point.

    const confirmPlacement = () => {
        if (!selectedPoint) return;
        const newSource = {
            id: Date.now(),
            lat: selectedPoint[0],
            lon: selectedPoint[1],
            intensity,
            type: sourceType
        };
        setLightSources([...lightSources, newSource]);

        // Visualize on map (using a custom command we'll add to MapView/Context)
        executeMapCommand({
            type: 'simulateLight',
            source: newSource
        } as any); // Type assertion until we update the definition

        setSelectionMode('none');
    };

    const clearSources = () => {
        setLightSources([]);
        executeMapCommand({ type: 'clearSimulation' } as any);
    };

    return (
        <section className="space-y-4">
            <div className="text-sm text-nocturna-light/80">
                Simulate the impact of new artificial light sources on the local dark sky environment.
            </div>

            <div className="space-y-3 p-3 bg-nocturna-dark/40 rounded-lg border border-nocturna-accent/10">
                <div className="space-y-1">
                    <label className="text-xs text-nocturna-light/70">Source Type</label>
                    <select
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value)}
                        className="w-full bg-nocturna-dark/50 text-nocturna-light rounded-md px-2 py-1.5 text-xs border border-nocturna-accent/20"
                    >
                        <option value="street">Street Light (LED 4000K)</option>
                        <option value="stadium">Stadium Floodlight</option>
                        <option value="commercial">Commercial Signage</option>
                        <option value="residential">Residential Security</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-nocturna-light/70">Intensity (Lumens): {intensity.toLocaleString()}</label>
                    <input
                        type="range"
                        min="500"
                        max="100000"
                        step="500"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full accent-nocturna-accent"
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleAddSource}
                        className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                            selectionMode === 'point'
                            ? 'bg-nocturna-accent/20 text-nocturna-accent border border-nocturna-accent'
                            : 'bg-nocturna-accent hover:bg-nocturna-accent/90 text-white'
                        }`}
                    >
                        <Plus className="w-3 h-3" />
                        {selectionMode === 'point' ? 'Click Map to Place' : 'Add Source'}
                    </button>

                    {selectionMode === 'point' && selectedPoint && (
                        <button
                            onClick={confirmPlacement}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium"
                        >
                            Confirm
                        </button>
                    )}
                </div>
            </div>

            {lightSources.length > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-nocturna-light/60">
                        <span>Active Sources: {lightSources.length}</span>
                        <button onClick={clearSources} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" /> Clear All
                        </button>
                    </div>

                    <div className="max-h-[150px] overflow-y-auto space-y-1 custom-scrollbar">
                        {lightSources.map(source => (
                            <div key={source.id} className="flex justify-between items-center p-2 bg-nocturna-dark/30 rounded border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-3 h-3 text-yellow-400" />
                                    <span className="text-xs text-nocturna-light/80 capitalize">{source.type}</span>
                                </div>
                                <span className="text-[10px] text-nocturna-light/50">{source.intensity.toLocaleString()} lm</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-md">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                            <div>
                                <div className="text-xs font-medium text-blue-300">Impact Analysis</div>
                                <div className="text-[10px] text-blue-200/70 mt-1">
                                    Total added skyglow: +{(lightSources.reduce((acc, s) => acc + s.intensity, 0) / 100000 * 0.5).toFixed(3)} mag/arcsec² (Estimated).
                                    <br/>
                                    Local Bortle class may degrade from 4 to 5.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
