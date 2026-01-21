'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { useSelection } from '@/context/SelectionContext';

interface PredictionData {
  date: Date;
  predictedMpsas: number;
  confidence: number;
}

interface SeasonalPattern {
  monthlyVariations: Array<{
    month: number;
    avgMpsas: number;
    avgRadiance: number;
    sampleCount: number;
  }>;
  peakMonth: number;
  lowestMonth: number;
}

export default function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState<PredictionData[] | null>(null);
  const [seasonalPattern, setSeasonalPattern] = useState<SeasonalPattern | null>(null);
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
      // Get predictions
      const predRes = await fetch(`/api/science/predictions?lat=${location.lat}&lon=${location.lon}&days=90`);
      const predData = await predRes.json();
      
      if (predData.error) {
        throw new Error(predData.error);
      }
      
      // Get seasonal patterns
      const seasonRes = await fetch(`/api/science/seasonal?lat=${location.lat}&lon=${location.lon}`);
      const seasonData = await seasonRes.json();
      
      if (seasonData.error) {
        throw new Error(seasonData.error);
      }
      
      // Transform prediction data for chart
      const transformedPredictions = predData.predictions.map((p: any) => ({
        date: new Date(p.date).toLocaleDateString(),
        predictedMpsas: p.predictedMpsas,
        confidence: p.confidence
      }));
      
      setPredictions(transformedPredictions);
      setSeasonalPattern(seasonData.patterns);
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
          Predictive analytics for light pollution trends using historical data and machine learning models.
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
            className="px-3 py-1.5 bg-nocturna-accent hover:bg-nocturna-accent/90 disabled:opacity-50 text-white text-xs rounded-md transition-colors flex items-center gap-1"
          >
            {loading ? (
              <>
                <BarChart3 className="w-3 h-3 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <BarChart3 className="w-3 h-3" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-red-400 p-4 text-center">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <div className="text-sm font-bold mb-1">Analysis Error</div>
            <div className="text-xs opacity-70">{error}</div>
          </div>
        ) : predictions ? (
          <div className="bg-nocturna-dark/20 rounded-lg border border-nocturna-accent/10 p-2 min-h-[200px]">
            <div className="text-xs text-nocturna-light/70 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              90-Day Light Pollution Forecast
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={predictions}>
                <defs>
                  <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickLine={false} />
                <YAxis stroke="#ffffff50" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#38BDF830', fontSize: '12px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Area
                  type="monotone"
                  dataKey="predictedMpsas"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorPredicted)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-xs text-nocturna-light/30 italic">
            Select region and run analysis to view predictions
          </div>
        )}

        {seasonalPattern && (
          <div className="bg-nocturna-dark/20 rounded-lg border border-nocturna-accent/10 p-2">
            <div className="text-xs text-nocturna-light/70 mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Seasonal Patterns
            </div>
            <div className="text-xs text-nocturna-light/80 mb-2">
              Peak month: {seasonalPattern.peakMonth}, Lowest month: {seasonalPattern.lowestMonth}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={seasonalPattern.monthlyVariations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#ffffff50" fontSize={8} tickLine={false} />
                <YAxis stroke="#ffffff50" fontSize={8} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#38BDF830', fontSize: '10px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Bar dataKey="avgMpsas" fill="#4F46E5" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}