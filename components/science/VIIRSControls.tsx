'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useState } from 'react';

interface VIIRSControlsProps {
    viirsVisible: boolean;
    onToggleViirs: () => void;
    opacity: number;
    onChangeOpacity: (val: number) => void;
    onStyleChange: (style: string) => void; // Add style change handler
}

export default function VIIRSControls({
    viirsVisible,
    onToggleViirs,
    opacity,
    onChangeOpacity,
    onStyleChange
}: VIIRSControlsProps) {
    const [visualizationStyle, setVisualizationStyle] = useState('radiance');

    const handleStyleChange = (style: string) => {
        setVisualizationStyle(style);
        // Call the parent handler to update the map layer style
        onStyleChange(style);
    };

    return (
        <section className="space-y-4">
            <div className="text-sm text-nocturna-light/80">
                VIIRS DNB scientific analysis is powered by VNP46A2 (Black Marble).
                Adjust layer visibility and opacity for overlay analysis.
            </div>

            <div className="bg-nocturna-dark/40 rounded-lg p-3 border border-nocturna-accent/10 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-nocturna-light">Layer Visibility</span>
                    <button
                        onClick={onToggleViirs}
                        className={`p-2 rounded-md transition-colors ${viirsVisible ? 'bg-nocturna-accent text-white' : 'bg-slate-700 text-slate-400'}`}
                        title={viirsVisible ? "Hide Layer" : "Show Layer"}
                    >
                        {viirsVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>

                <div>
                    <div className="flex justify-between text-xs text-nocturna-light/60 mb-2">
                        <span>Opacity</span>
                        <span>{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-nocturna-accent"
                    />
                </div>

                <AdvancedVisualizationControls onStyleChange={onStyleChange} />
            </div>

            <div className="bg-nocturna-dark/40 rounded-lg p-3 border border-nocturna-accent/10 space-y-3">
                <div className="text-sm font-medium text-nocturna-light">Ground Truth Verification</div>
                <div className="text-xs text-nocturna-light/70">
                    Correlate satellite radiance with local SQM sensors (within 5km).
                </div>

                <CorrelationTool />
            </div>

            <div className="text-xs text-nocturna-light/60">
                Source: NASA/NOAA Suomi NPP VIIRS Day/Night Band.
            </div>
        </section>
    );
}

function CorrelationTool() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const { selectedPoint } = useSelection(); // Use the selected point from context

    async function check() {
        if (!selectedPoint) {
            alert('Please select a point on the map first');
            return;
        }

        setLoading(true);
        try {
            const [lat, lon] = selectedPoint;

            const res = await fetch(`/api/science/correlation?lat=${lat}&lon=${lon}&radius=5`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!data) {
        return (
            <button
                onClick={check}
                disabled={loading || !selectedPoint}
                className={`w-full py-1.5 rounded border border-nocturna-accent/50 transition-colors ${
                    selectedPoint
                        ? 'bg-nocturna-accent/20 hover:bg-nocturna-accent/30 text-nocturna-accent'
                        : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
            >
                {loading ? 'Analyzing...' : selectedPoint ? 'Run Correlation Analysis' : 'Select Point First'}
            </button>
        );
    }

    return (
        <div className="space-y-2 bg-slate-900/50 p-2 rounded border border-slate-700">
            <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className={data.correlation_status === 'MATCH' ? 'text-emerald-400' : 'text-orange-400'}>
                    {data.correlation_status}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <div className="text-slate-500 text-[10px] uppercase">Satellite</div>
                    <div className="text-slate-200">{data.satellite_radiance_nw} nW</div>
                </div>
                <div>
                    <div className="text-slate-500 text-[10px] uppercase">Ground (SQM)</div>
                    <div className="text-slate-200">{data.ground_avg_mpsas} mag/arcsec²</div>
                </div>
            </div>
            <button onClick={() => setData(null)} className="text-[10px] text-slate-500 hover:text-slate-300 w-full text-center mt-1">
                Reset
            </button>
        </div>
    );
}

// Add a new component for advanced visualization controls
function AdvancedVisualizationControls({
    onStyleChange
}: {
    onStyleChange: (style: string) => void
}) {
    const [selectedStyle, setSelectedStyle] = useState('radiance');

    const styles = [
        { id: 'radiance', label: 'Radiance (nW/cm²/sr)', description: 'Raw radiance values' },
        { id: 'anomaly', label: 'Anomaly Detection', description: 'Detect unusual lighting patterns' },
        { id: 'trend', label: 'Trend Analysis', description: 'Show temporal changes' },
        { id: 'classification', label: 'Light Type', description: 'Categorize light sources' }
    ];

    const handleChange = (styleId: string) => {
        setSelectedStyle(styleId);
        onStyleChange(styleId);
    };

    return (
        <div className="space-y-3">
            <div className="text-xs text-nocturna-light/70">Visualization Style</div>
            <div className="grid grid-cols-2 gap-2">
                {styles.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => handleChange(style.id)}
                        className={`p-2 rounded border text-xs ${
                            selectedStyle === style.id
                                ? 'bg-nocturna-accent text-white border-nocturna-accent'
                                : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700/50'
                        }`}
                    >
                        <div className="font-medium">{style.label}</div>
                        <div className="text-[10px] opacity-70">{style.description}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
