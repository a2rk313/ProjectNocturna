'use client';

import { useState, useEffect } from 'react';
import { CloudMoon, Wind, Thermometer, Calendar } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';

export default function AstroForecast() {
    const { selectedPoint } = useSelection();
    const [loading, setLoading] = useState(false);
    const [forecast, setForecast] = useState<any>(null);

    // Mock Forecast Generator
    // In a real app, this would fetch from a weather API (OpenWeatherMap, ClearOutside, etc.)
    const generateForecast = (lat: number, lon: number) => {
        const days = [];
        const today = new Date();

        for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);

            // Randomize weather for demo
            const cloudCover = Math.floor(Math.random() * 100);
            const moonPhase = (today.getDate() + i) % 30 / 30; // approximate
            const seeing = Math.floor(Math.random() * 5) + 1; // 1-5 scale

            // Calculate Score
            // Weight: Cloud (50%), Moon (30%), Seeing (20%)
            // Low cloud is good, low moon phase (new moon) is good, high seeing is good.
            const cloudScore = (100 - cloudCover);
            const moonScore = (1 - Math.abs(moonPhase - 0.5) * 2) * 100; // 100 at 0.5 (full)? No, we want New Moon (0 or 1).
            // Actually: New Moon (0 or 1) is best. Full Moon (0.5) is worst.
            // Distance from 0.5: |0.5 - 0.5| = 0 (Full). |0 - 0.5| = 0.5 (New).
            const moonQuality = Math.abs(moonPhase - 0.5) * 2 * 100;

            const score = (cloudScore * 0.5) + (moonQuality * 0.3) + (seeing * 20 * 0.2);

            days.push({
                date: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                cloudCover,
                moonPhase,
                seeing,
                score: Math.round(score),
                temp: Math.round(10 + Math.random() * 15),
                wind: Math.round(Math.random() * 20)
            });
        }
        return days;
    };

    useEffect(() => {
        if (selectedPoint) {
            setLoading(true);
            // Simulate API delay
            setTimeout(() => {
                setForecast(generateForecast(selectedPoint[0], selectedPoint[1]));
                setLoading(false);
            }, 800);
        }
    }, [selectedPoint]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBarColor = (score: number) => {
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <section className="space-y-4">
            <div className="text-sm text-nocturna-light/80">
                7-day stargazing suitability forecast based on cloud cover, moon phase, and atmospheric stability.
            </div>

            {!selectedPoint && (
                <div className="p-4 text-center bg-nocturna-dark/30 rounded-lg border border-dashed border-nocturna-accent/20">
                    <CloudMoon className="w-8 h-8 text-nocturna-light/20 mx-auto mb-2" />
                    <div className="text-xs text-nocturna-light/50">Select a location on the map to view forecast</div>
                </div>
            )}

            {loading && (
                <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-nocturna-dark/40 rounded-md"></div>
                    ))}
                </div>
            )}

            {forecast && !loading && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-nocturna-light/60 pb-2 border-b border-nocturna-accent/10">
                        <span>Location: {selectedPoint?.[0].toFixed(2)}, {selectedPoint?.[1].toFixed(2)}</span>
                        <span>Source: Modeled</span>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {forecast.map((day: any, i: number) => (
                            <div key={i} className="bg-nocturna-dark/40 rounded-lg p-3 border border-nocturna-accent/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-nocturna-light text-sm">{day.date}</div>
                                    <div className={`font-bold text-sm ${getScoreColor(day.score)}`}>
                                        {day.score}/100
                                    </div>
                                </div>

                                {/* Score Bar */}
                                <div className="h-1.5 w-full bg-nocturna-dark/80 rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full ${getScoreBarColor(day.score)}`}
                                        style={{ width: `${day.score}%` }}
                                    ></div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-nocturna-navy/40 rounded p-1.5">
                                        <CloudMoon className="w-3 h-3 mx-auto text-blue-300 mb-1" />
                                        <div className="text-[10px] text-nocturna-light/70">{day.cloudCover}%</div>
                                        <div className="text-[8px] text-nocturna-light/40">Cloud</div>
                                    </div>
                                    <div className="bg-nocturna-navy/40 rounded p-1.5">
                                        {/* Moon Phase Icon approximation */}
                                        <div className="w-3 h-3 mx-auto rounded-full border border-yellow-200 mb-1 bg-gradient-to-r from-yellow-200 to-transparent" style={{background: `linear-gradient(90deg, #fef08a ${day.moonPhase*100}%, transparent 0)`}}></div>
                                        <div className="text-[10px] text-nocturna-light/70">{Math.round(day.moonPhase * 100)}%</div>
                                        <div className="text-[8px] text-nocturna-light/40">Moon</div>
                                    </div>
                                    <div className="bg-nocturna-navy/40 rounded p-1.5">
                                        <Thermometer className="w-3 h-3 mx-auto text-red-300 mb-1" />
                                        <div className="text-[10px] text-nocturna-light/70">{day.temp}°C</div>
                                        <div className="text-[8px] text-nocturna-light/40">Temp</div>
                                    </div>
                                    <div className="bg-nocturna-navy/40 rounded p-1.5">
                                        <Wind className="w-3 h-3 mx-auto text-gray-300 mb-1" />
                                        <div className="text-[10px] text-nocturna-light/70">{day.wind}kph</div>
                                        <div className="text-[8px] text-nocturna-light/40">Wind</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
