'use client';

import { AlertCircle, Leaf, Zap, Shield, Microscope } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useState, useEffect } from 'react';

interface AssessmentResult {
    impactLevel?: string;
    nearbyHotspots?: Array<{ name: string; distance_km?: number }>
    affectedSpecies?: string[];
    threats?: string[];
    [key: string]: any;
}

export default function ImpactAssessment({ type }: { type: 'ecology' | 'energy' | 'spectral' | 'policy' }) {
    const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { selectedPoint } = useSelection();
    const location = selectedPoint ? { lat: selectedPoint[0], lon: selectedPoint[1] } : null;

    useEffect(() => {
        if (location) {
            runAssessment();
        } else {
            setAssessment(null); // Clear assessment if no location is selected
        }
    }, [location]); // Depend on location, which changes when selectedPoint changes

    async function runAssessment() {
        if (!location) return;
        setLoading(true);
        setError(null);
        try {
            let url = '';
            let method = 'GET';
            let body = undefined;

            switch (type) {
                case 'ecology':
                    url = `/api/science/impact`;
                    method = 'POST';
                    body = JSON.stringify({ lat: location.lat, lon: location.lon });
                    break;
                case 'energy':
                    url = `/api/science/energy-waste?lat=${location.lat}&lon=${location.lon}`;
                    break;
                case 'spectral':
                    url = `/api/science/spectral?lat=${location.lat}&lon=${location.lon}`;
                    break;
                case 'policy':
                    url = `/api/science/policy/simulate`;
                    method = 'POST';
                    body = JSON.stringify({ lat: location.lat, lon: location.lon, policyId: 'shielding_v1' });
                    break;
            }

            const res = await fetch(url, {
                method,
                headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
                body
            });

            const result = await res.json();
            if (result.error) throw new Error(result.error);

            // The API returns the assessment object directly, not wrapped in .metrics
            setAssessment(result);

        } catch (e: any) {
            setError(e.message || 'Assessment failed');
        } finally {
            setLoading(false);
        }
    }

    const renderContent = () => {
        if (loading) return <div className="text-xs text-nocturna-light/50 italic p-4">Running complex model assessment...</div>;
        if (error) return <div className="text-xs text-red-400 p-4">Error: {error}</div>;
        if (!assessment) return (
            <div className="p-4 text-center">
                <button
                    onClick={runAssessment}
                    className="bg-nocturna-accent hover:bg-nocturna-accent/90 text-white rounded-md px-4 py-2 text-sm transition-colors"
                >
                    Run {type.charAt(0).toUpperCase() + type.slice(1)} Assessment
                </button>
            </div>
        );

        // Defensive destructuring in case API response is partial or malformed
        const {
            impactLevel = 'LOW',
            nearbyHotspots = [],
            affectedSpecies = [],
            threats = []
        } = assessment;

        return (
            <div className="space-y-3">
                <div className="bg-nocturna-dark/40 rounded p-3 border border-nocturna-accent/10">
                    <div className="text-xs text-nocturna-light/60 uppercase tracking-wider mb-1">Impact Level</div>
                    <div className={`text-xl font-bold ${impactLevel === 'CRITICAL' ? 'text-red-500' : impactLevel === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {impactLevel}
                    </div>
                </div>

                {nearbyHotspots && nearbyHotspots.length > 0 && (
                    <div className="bg-nocturna-dark/40 rounded p-2 border border-nocturna-accent/10">
                        <div className="text-xs text-nocturna-light/60 mb-2">Nearby Protected Areas</div>
                        <ul className="space-y-1">
                            {nearbyHotspots.map((h: any, i: number) => (
                                <li key={i} className="text-xs text-nocturna-light flex justify-between">
                                    <span>{h.name}</span>
                                    <span className="opacity-50">{h.distance_km?.toFixed(1) || '0.0'} km</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {affectedSpecies && affectedSpecies.length > 0 && (
                    <div className="bg-nocturna-dark/40 rounded p-2 border border-nocturna-accent/10">
                        <div className="text-xs text-nocturna-light/60 mb-1">Affected Species</div>
                        <div className="text-xs text-nocturna-light italic">
                            {affectedSpecies.slice(0, 5).join(', ')}{affectedSpecies.length > 5 ? '...' : ''}
                        </div>
                    </div>
                )}

                <button onClick={runAssessment} className="text-xs text-nocturna-accent hover:underline w-full text-center mt-2">
                    Re-run Model
                </button>
            </div>
        );
    };

    return (
        <section className="space-y-3">
            <div className="text-sm text-nocturna-light/80">
                {type === 'ecology' && 'Ecological impact assessment: risk scoring for sensitive taxa.'}
                {type === 'energy' && 'Energy waste analysis: radiance trends → estimated energy waste.'}
                {type === 'spectral' && 'Spectral signature analysis: estimate “warm vs cool” lighting.'}
                {type === 'policy' && 'Policy impact simulation: shielding ordinances.'}
            </div>

            <div className="bg-nocturna-navy/40 rounded-lg border border-nocturna-accent/10 min-h-[150px] flex flex-col justify-center">
                {renderContent()}
            </div>
        </section>
    );
}
