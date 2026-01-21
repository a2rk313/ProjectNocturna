'use client';

import dynamic from 'next/dynamic';
import CitizenPanel from './CitizenPanel';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function CitizenDashboard() {
  return (
    <div className="relative w-full h-full">
      <MapView />
      <CitizenPanel />
    </div>
  );
}

