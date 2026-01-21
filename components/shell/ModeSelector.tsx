'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Telescope, Beaker } from 'lucide-react';

export default function ModeSelector() {
    const pathname = usePathname();
    const isCitizen = pathname?.startsWith('/citizen');
    const isScience = pathname?.startsWith('/science');

    return (
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700 backdrop-blur-sm">
            <Link
                href="/citizen"
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    isCitizen
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
            >
                <Telescope className="w-4 h-4" />
                Citizen
            </Link>
            <Link
                href="/science"
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    isScience
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
            >
                <Beaker className="w-4 h-4" />
                Science
            </Link>
        </div>
    );
}
