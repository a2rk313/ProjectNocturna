'use client';

import { MousePointer2, BoxSelect, Hand } from 'lucide-react';

interface MapActionControlsProps {
    drawMode: 'none' | 'point' | 'polygon';
    setDrawMode: (mode: 'none' | 'point' | 'polygon') => void;
}

export default function MapActionControls({ drawMode, setDrawMode }: MapActionControlsProps) {
    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-nocturna-navy/90 backdrop-blur border border-nocturna-accent/20 rounded-full px-2 py-1 flex gap-1 shadow-xl">
            <ControlBtn
                active={drawMode === 'none'}
                onClick={() => setDrawMode('none')}
                icon={<Hand className="w-4 h-4" />}
                label="Pan"
            />
            <ControlBtn
                active={drawMode === 'point'}
                onClick={() => setDrawMode('point')}
                icon={<MousePointer2 className="w-4 h-4" />}
                label="Select Point"
            />
            <ControlBtn
                active={drawMode === 'polygon'}
                onClick={() => setDrawMode('polygon')}
                icon={<BoxSelect className="w-4 h-4" />}
                label="Select Area"
            />
        </div>
    );
}

function ControlBtn({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`p-2 rounded-full transition-all flex items-center gap-2 px-3 ${active
                    ? 'bg-nocturna-accent text-white shadow-lg'
                    : 'text-nocturna-light/70 hover:bg-white/10 hover:text-white'
                }`}
        >
            {icon}
            {active && <span className="text-xs font-medium">{label}</span>}
        </button>
    );
}
