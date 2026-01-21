'use client';

import { useState, useEffect } from 'react';
import { Cloud, Moon, Star } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

export default function ObservationPlanner() {
    const [loading, setLoading] = useState(false);
    const [planning, setPlanning] = useState<{
        score: number;
        details: { cloudCover: string; moonPhase: string; seeing: string; lightPollution: string };
        recommendation: string;
    } | null>(null);

    const { selectedPoint } = useSelection();

    useEffect(() => {
        if (selectedPoint) {
            runPlanning();
        }
    }, [selectedPoint]);

    async function runPlanning() {
        if (!selectedPoint) return;
        setLoading(true);
        try {
            const [lat, lon] = selectedPoint;
            const res = await fetch('/api/observations/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat,
                    lon,
                }),
            });
            const data = await res.json();
            setPlanning(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="space-y-4">
            <div className="text-sm text-nocturna-light/80">
                Get a real-time "Stargazing Score" based on cloud cover (WeatherAPI), moon phase, and local light pollution.
            </div>

            <button
                className="w-full rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-3 py-3 text-sm text-white font-medium shadow-lg shadow-indigo-500/20 transition-all"
                onClick={runPlanning}
                disabled={loading}
            >
                {loading ? 'Analyzing Sky Conditions...' : 'Calculate Night Score'}
            </button>

            {planning && (
                <div className="rounded-lg bg-nocturna-dark/40 border border-nocturna-accent/10 p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-nocturna-light/80">Tonight's Score</span>
                        <span className={`text-2xl font-bold ${planning.score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {planning.score}/100
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-nocturna-light/60 mb-1">
                                <Cloud className="w-3 h-3" /> Cloud
                            </div>
                            <div className="text-sm font-medium text-nocturna-light">{planning.details.cloudCover}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-nocturna-light/60 mb-1">
                                <Moon className="w-3 h-3" /> Moon
                            </div>
                            <div className="text-sm font-medium text-nocturna-light">{planning.details.moonPhase}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-nocturna-light/60 mb-1">
                                <Star className="w-3 h-3" /> Seeing
                            </div>
                            <div className="text-sm font-medium text-nocturna-light">{planning.details.seeing}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-nocturna-light/60 mb-1">
                                L.P.
                            </div>
                            <div className="text-xs font-medium text-nocturna-light truncate" title={planning.details.lightPollution}>
                                {planning.details.lightPollution}
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-center text-nocturna-light/70 italic bg-white/5 rounded py-2 px-3">
                        "{planning.recommendation}"
                    </div>
                </div>
            )}
        </section>
    );
}
