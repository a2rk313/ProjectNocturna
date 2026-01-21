'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import ModeSelector from './ModeSelector';

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="absolute top-0 left-0 right-0 z-[1100]">
      <div className="m-4 rounded-xl border border-nocturna-accent/20 bg-nocturna-navy/85 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-nocturna-accent/20 border border-nocturna-accent/30" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-nocturna-light">Project Nocturna</div>
              <div className="text-xs text-nocturna-light/60">Scientific WebGIS</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                'px-3 py-2 rounded-md text-sm transition-colors',
                pathname === '/'
                  ? 'bg-nocturna-accent text-white'
                  : 'text-nocturna-light/80 hover:text-nocturna-light hover:bg-nocturna-dark/40'
              )}
            >
              Map
            </Link>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <ModeSelector />
          </nav>
        </div>
      </div>
    </header>
  );
}

