'use client';

import React from 'react';
import { Microscope, Users, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ModeSelection() {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-nocturna-dark overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nocturna-accent/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="z-10 text-center space-y-8 px-4 max-w-4xl">
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nocturna-accent/10 border border-nocturna-accent/20 text-nocturna-accent text-xs font-bold tracking-widest uppercase mb-4">
                        <Sparkles size={12} />
                        Scientific WebGIS Platform
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
                        Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-nocturna-accent to-indigo-400">Nocturna</span>
                    </h1>
                    <p className="text-lg md:text-xl text-nocturna-light/70 max-w-2xl mx-auto">
                        Discover pristine dark skies and analyze light pollution trends using NASA VIIRS satellite data and global SQM networks.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    {/* Science Mode */}
                    <Link href="/science" className="group relative">
                        <div className="absolute inset-0 bg-nocturna-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative h-full p-8 rounded-2xl bg-nocturna-navy/40 border border-white/5 backdrop-blur-xl hover:border-nocturna-accent/30 transition-all text-left">
                            <div className="w-12 h-12 rounded-xl bg-nocturna-accent/20 flex items-center justify-center text-nocturna-accent mb-6 group-hover:scale-110 transition-transform">
                                <Microscope size={24} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Scientific Mode</h3>
                            <p className="text-sm text-nocturna-light/60">
                                Advanced analytical tools for environmental research. Z-score anomaly detection, radiance forecasting, and ecological impact modeling.
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-nocturna-accent text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                Enter Laboratory →
                            </div>
                        </div>
                    </Link>

                    {/* Citizen Mode */}
                    <Link href="/citizen" className="group relative">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative h-full p-8 rounded-2xl bg-nocturna-navy/40 border border-white/5 backdrop-blur-xl hover:border-indigo-500/30 transition-all text-left">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Discovery Mode</h3>
                            <p className="text-sm text-nocturna-light/60">
                                Find the darkest skies for stargazing. Observation planner, Bortle scale mapping, and International Dark-Sky Park directory.
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-indigo-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                Start Exploring →
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
