'use client';

import { useEffect, useState } from 'react';
import { Compass, MapPin, Telescope, CloudMoon, CalendarDays } from 'lucide-react';
import DarkSkyDiscovery from '@/components/citizen/DarkSkyDiscovery';
import ObservationPlanner from '@/components/citizen/ObservationPlanner';
import ParksDirectory from '@/components/citizen/ParksDirectory';
import AstroForecast from '@/components/citizen/AstroForecast';

export default function CitizenPanel() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'planning' | 'forecast' | 'parks' | 'realtime'>('discovery');
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => null,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return (
    <aside className="absolute top-20 left-4 z-[1050] w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl border border-nocturna-accent/20 bg-nocturna-navy/85 backdrop-blur-md shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="px-4 py-3 border-b border-nocturna-accent/15 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-nocturna-light">Citizen Mode</div>
              <div className="text-xs text-nocturna-light/60">Discovery • Planning • Parks</div>
            </div>
            <div className="text-xs text-nocturna-light/70">
              {geo ? `GPS: ${geo.lat.toFixed(2)}, ${geo.lon.toFixed(2)}` : 'GPS: locating...'}
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-2 border-b border-nocturna-accent/15 flex-shrink-0 overflow-x-auto custom-scrollbar">
          <TabButton icon={<Compass className="w-4 h-4" />} active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')}>
            Discovery
          </TabButton>
          <TabButton icon={<CalendarDays className="w-4 h-4" />} active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')}>
            Forecast
          </TabButton>
          <TabButton icon={<CloudMoon className="w-4 h-4" />} active={activeTab === 'planning'} onClick={() => setActiveTab('planning')}>
            Planning
          </TabButton>
          <TabButton icon={<MapPin className="w-4 h-4" />} active={activeTab === 'parks'} onClick={() => setActiveTab('parks')}>
            Parks
          </TabButton>
          <TabButton icon={<Telescope className="w-4 h-4" />} active={activeTab === 'realtime'} onClick={() => setActiveTab('realtime')}>
            Real-time
          </TabButton>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'discovery' && <DarkSkyDiscovery />}

          {activeTab === 'forecast' && <AstroForecast />}

          {activeTab === 'planning' && <ObservationPlanner />}

          {activeTab === 'parks' && <ParksDirectory />}

          {activeTab === 'realtime' && (
            <section className="space-y-3">
              <div className="text-sm text-nocturna-light/80">
                Real-time layers will include FIRMS fires (to flag temporary lights) and optional SQM feeds.
              </div>
              <div className="rounded-lg bg-nocturna-dark/40 border border-nocturna-accent/10 p-3 text-xs text-nocturna-light/70">
                Data sources: NASA FIRMS (Active Fires), SQM Network (Live)
              </div>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}

function TabButton({
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
        'flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-md text-xs transition-colors',
        active ? 'bg-nocturna-accent text-white' : 'text-nocturna-light/75 hover:bg-nocturna-dark/40 hover:text-nocturna-light',
      ].join(' ')}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

