'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import SciencePanel from './SciencePanel';
import { useSelection } from '@/context/SelectionContext';

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false });

export default function ScienceDashboard() {
  // Lifted state to allow Sidebar to control Map layers
  const [viirsVisible, setViirsVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.7);
  const [viirsStyle, setViirsStyle] = useState('viirs_radiance'); // Default style

  const { mapCommand } = useSelection();

  useEffect(() => {
    if (mapCommand?.type === 'setLayer') {
      if (mapCommand.layer === 'viirs' || mapCommand.layer === 'night_lights') {
        setViirsVisible(mapCommand.visible);
      }
    }
  }, [mapCommand]);

  return (
    <div className="relative w-full h-full">
      <MapView
        viirsVisible={viirsVisible}
        viirsOpacity={opacity}
        viirsStyle={viirsStyle}
      />
      <SciencePanel
        viirsVisible={viirsVisible}
        onToggleViirs={() => setViirsVisible(!viirsVisible)}
        opacity={opacity}
        onChangeOpacity={setOpacity}
        onStyleChange={setViirsStyle} // Pass style change handler
      />
    </div>
  );
}

