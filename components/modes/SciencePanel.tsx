'use client';

import { useState } from 'react';
import { FlaskConical, TrendingUp, Leaf, Zap, Thermometer, Shield, BarChart3 } from 'lucide-react';
import VIIRSControls from '@/components/science/VIIRSControls';
import TrendAnalysis from '@/components/science/TrendAnalysis';
import ImpactAssessment from '@/components/science/ImpactAssessment';
import PredictiveAnalytics from '@/components/science/PredictiveAnalytics';

interface SciencePanelProps {
  viirsVisible: boolean;
  onToggleViirs: () => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  onStyleChange: (style: string) => void; // Add style change handler
}

export default function SciencePanel({
  viirsVisible,
  onToggleViirs,
  opacity,
  onChangeOpacity,
  onStyleChange // Add the new prop
}: SciencePanelProps) {
  const [activeTab, setActiveTab] = useState<'viirs' | 'trends' | 'ecology' | 'energy' | 'spectral' | 'policy' | 'predictive'>('viirs');

  return (
    <aside className="absolute top-20 left-4 z-[1050] w-[520px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl border border-nocturna-accent/20 bg-nocturna-navy/85 backdrop-blur-md shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="px-4 py-3 border-b border-nocturna-accent/15 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-nocturna-light">Scientific Mode</div>
              <div className="text-xs text-nocturna-light/60">VIIRS VNP46A2 • Trends • Ecology • Energy</div>
            </div>
            <div className="text-xs text-nocturna-light/70">APIs return JSON for reproducible analysis</div>
          </div>
        </div>

        <div className="flex gap-1 p-2 border-b border-nocturna-accent/15 overflow-x-auto flex-shrink-0 custom-scrollbar">
          <Tab icon={<FlaskConical className="w-4 h-4" />} active={activeTab === 'viirs'} onClick={() => setActiveTab('viirs')}>
            VIIRS
          </Tab>
          <Tab icon={<TrendingUp className="w-4 h-4" />} active={activeTab === 'trends'} onClick={() => setActiveTab('trends')}>
            Trends
          </Tab>
          <Tab icon={<BarChart3 className="w-4 h-4" />} active={activeTab === 'predictive'} onClick={() => setActiveTab('predictive')}>
            Predictive
          </Tab>
          <Tab icon={<Leaf className="w-4 h-4" />} active={activeTab === 'ecology'} onClick={() => setActiveTab('ecology')}>
            Ecology
          </Tab>
          <Tab icon={<Zap className="w-4 h-4" />} active={activeTab === 'energy'} onClick={() => setActiveTab('energy')}>
            Energy
          </Tab>
          <Tab icon={<Thermometer className="w-4 h-4" />} active={activeTab === 'spectral'} onClick={() => setActiveTab('spectral')}>
            Spectral
          </Tab>
          <Tab icon={<Shield className="w-4 h-4" />} active={activeTab === 'policy'} onClick={() => setActiveTab('policy')}>
            Policy
          </Tab>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'viirs' && (
            <VIIRSControls
              viirsVisible={viirsVisible}
              onToggleViirs={onToggleViirs}
              opacity={opacity}
              onChangeOpacity={onChangeOpacity}
              onStyleChange={onStyleChange} // Pass the style change handler
            />
          )}

          {activeTab === 'trends' && <TrendAnalysis />}

          {activeTab === 'predictive' && <PredictiveAnalytics />}

          {activeTab === 'ecology' && <ImpactAssessment type="ecology" />}

          {activeTab === 'energy' && <ImpactAssessment type="energy" />}

          {activeTab === 'spectral' && <ImpactAssessment type="spectral" />}

          {activeTab === 'policy' && <ImpactAssessment type="policy" />}
        </div>
      </div>
    </aside>
  );
}

function Tab({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap transition-colors',
        active ? 'bg-nocturna-accent text-white' : 'text-nocturna-light/75 hover:bg-nocturna-dark/40 hover:text-nocturna-light',
      ].join(' ')}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}



