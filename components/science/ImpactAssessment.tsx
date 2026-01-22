'use client';

import { AlertCircle, Leaf, Zap, Shield, Microscope } from 'lucide-react';
import { useSelection } from '@/context/SelectionContext';
import { useState, useEffect } from 'react';

interface AssessmentResult {
    // Ecology (Root level)
    impactLevel?: string;
    nearbyHotspots?: Array<{ name: string; distance_km?: number }>
    affectedSpecies?: string[];
    threats?: string[];

    // Others (Wrapped in metrics)
    metrics?: {
        // Energy
        totalWaste?: string;
        cost?: string;
        co2?: string;
        potentialSavings?: string;

        // Policy
        policy?: string;
        predictedReduction?: string;
        complianceCost?: string;
        timeToROI?: string;
        currentRadiance?: string;
        simulatedRadiance?: string;

        // Spectral
        cctRange?: string;
        blueLightIndex?: number;
        biologicalDisruption?: string;
        typeClassification?: string;
        radianceRef?: string;
    };
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
    }, [location, type]);

    async function runAssessment() {
        if (!location) return;
        setLoading(true);
        setError(null);
        setAssessment(null);

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

        // Render based on type/metrics
        if (type === 'energy' && assessment.metrics) {
            const m = assessment.metrics;
            return (
                <div className="space-y-3 p-1">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricBox label="Annual Waste" value={m.totalWaste} />
                        <MetricBox label="Est. Cost" value={m.cost} />
                        <MetricBox label="CO2 Emissions" value={m.co2} />
                        <MetricBox label="Potential Savings" value={m.potentialSavings + (m.potentialSavings?.includes('%') ? '' : '%')} highlight />
                    </div>
                </div>
            );
        }

        if (type === 'policy' && assessment.metrics) {
            const m = assessment.metrics;
            return (
                <div className="space-y-3 p-1">
                     <div className="bg-nocturna-dark/40 rounded p-2 border border-nocturna-accent/10 mb-2">
                        <div className="text-xs text-nocturna-light/60 uppercase">Applied Policy</div>
                        <div className="text-sm font-medium text-nocturna-light">{m.policy}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <MetricBox label="Reduction" value={m.predictedReduction} highlight />
                        <MetricBox label="Compliance Cost" value={m.complianceCost} />
                        <MetricBox label="ROI Time" value={m.timeToROI} />
                        <MetricBox label="Sim. Radiance" value={m.simulatedRadiance} />
                    </div>
                </div>
            );
        }

        if (type === 'spectral' && assessment.metrics) {
            const m = assessment.metrics;
            return (
                <div className="space-y-3 p-1">
                    <div className="bg-nocturna-dark/40 rounded p-2 border border-nocturna-accent/10 mb-2">
                        <div className="text-xs text-nocturna-light/60 uppercase">Light Source Class</div>
                        <div className="text-sm font-medium text-nocturna-light">{m.typeClassification}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <MetricBox label="CCT Range" value={m.cctRange} />
                        <MetricBox label="Blue Light Idx" value={m.blueLightIndex} />
                        <MetricBox label="Bio-Disruption" value={m.biologicalDisruption} highlight={m.biologicalDisruption === 'Critical'} />
                        <MetricBox label="Radiance" value={m.radianceRef} />
                    </div>
                </div>
            );
        }

        // Default: Ecology
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

function MetricBox({ label, value, highlight }: { label: string, value?: string | number, highlight?: boolean }) {
    return (
        <div className={`bg-nocturna-dark/40 rounded p-2 border ${highlight ? 'border-nocturna-accent/40 bg-nocturna-accent/5' : 'border-nocturna-accent/10'}`}>
            <div className="text-[10px] text-nocturna-light/60 uppercase truncate" title={label}>{label}</div>
            <div className={`text-sm font-medium ${highlight ? 'text-nocturna-accent' : 'text-nocturna-light'}`}>{value || 'N/A'}</div>
        </div>
    );
}
