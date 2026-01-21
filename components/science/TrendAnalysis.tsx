'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSelection } from '@/context/SelectionContext';

interface DataPoint {
    year: number;
    value: number;
    type?: 'measure' | 'forecast';
}

interface Metrics {
    slope: number;
    r2: number;
    anomaly?: {
        is_anomaly: boolean;
        cause: string;
    };
}

export default function TrendAnalysis() {
    const [data, setData] = useState<DataPoint[] | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { selectedPoint } = useSelection();
    const location = selectedPoint ? { lat: selectedPoint[0], lon: selectedPoint[1] } : null;

    useEffect(() => {
        if (location) {
            runAnalysis();
        }
    }, [selectedPoint]);

    async function runAnalysis() {
        if (!location) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/science/trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: location.lat,
                    lon: location.lon,
                    forecastYears: 5
                }),
            });
            const result = await res.json();

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Combine historical and forecast data
            const combinedData = [...(result.historical || []), ...(result.forecast || [])];

            setData(combinedData);
            setMetrics({
                slope: result.slope_per_year,
                r2: result.r2,
                anomaly: result.anomaly
            });
        } catch (e: any) {
            setError(e.message || 'Analysis failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="space-y-4 h-full flex flex-col">
            <div className="space-y-2 flex-shrink-0">
                <div className="text-sm text-nocturna-light/80">
                    Analyze historical radiance trends (VIIRS VNP46A2) and forecast future light pollution levels.
                </div>
                <div className="flex items-center justify-between bg-nocturna-dark/30 p-2 rounded-md border border-nocturna-accent/10">
                    <div className="text-xs text-nocturna-light/70">
                        Target: <span className="text-nocturna-light font-mono">
                            {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'No location selected'}
                        </span>
                    </div>
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="px-3 py-1.5 bg-nocturna-accent hover:bg-nocturna-accent/90 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
                    >
                        {loading ? 'Processing...' : 'Run Analysis'}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-nocturna-dark/20 rounded-lg border border-nocturna-accent/10 p-2 min-h-[200px]">
                {error ? (
                    <div className="h-full flex flex-col items-center justify-center text-red-400 p-4 text-center">
                        <div className="text-sm font-bold mb-1">Analysis Error</div>
                        <div className="text-xs opacity-70">{error}</div>
                    </div>
                ) : data ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey="year" stroke="#ffffff50" fontSize={10} tickLine={false} />
                            <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#38BDF830', fontSize: '12px' }}
                                itemStyle={{ color: '#E2E8F0' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#0EA5E9"
                                fillOpacity={1}
                                fill="url(#colorVal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-nocturna-light/30 italic">
                        Select region and run analysis to view trends
                    </div>
                )}
            </div>

            {metrics && (
                <div className="space-y-2 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-nocturna-dark/40 rounded-md p-2 border border-nocturna-accent/10">
                            <div className="text-[10px] text-nocturna-light/50 uppercase tracking-wider">Annual Growth</div>
                            <div className="text-lg font-semibold text-nocturna-light">
                                {metrics.slope > 0 ? '+' : ''}{metrics.slope.toFixed(3)} <span className="text-xs font-normal opacity-60">nW/yr</span>
                            </div>
                        </div>
                        <div className="bg-nocturna-dark/40 rounded-md p-2 border border-nocturna-accent/10">
                            <div className="text-[10px] text-nocturna-light/50 uppercase tracking-wider">Model Fit (R²)</div>
                            <div className="text-lg font-semibold text-nocturna-light">{metrics.r2.toFixed(3)}</div>
                        </div>
                    </div>
                    {metrics.anomaly && (
                        <div className={`rounded-md p-2 border ${metrics.anomaly.is_anomaly ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${metrics.anomaly.is_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {metrics.anomaly.is_anomaly ? '⚠ Anomaly Detected' : '✓ Normal Levels'}
                                </span>
                                <span className="text-[10px] text-nocturna-light/60">{metrics.anomaly.cause}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
