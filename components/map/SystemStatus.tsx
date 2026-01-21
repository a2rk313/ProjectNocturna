'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Server, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SystemStatus() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkHealth() {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setStatus(data);
            } catch (e) {
                setStatus({ status: 'offline', components: { database: 'down', geoserver: 'down' } });
            } finally {
                setLoading(false);
            }
        }
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    const isHealthy = status?.status === 'healthy';

    return (
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all ${isHealthy
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                <Activity size={14} className={isHealthy ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                    {status?.status || 'Offline'}
                </span>
            </div>

            {!isHealthy && (
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-nocturna-dark/80 border border-white/5 shadow-xl backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5 opacity-70">
                            <Database size={10} />
                            <span>Database</span>
                        </div>
                        {status?.components?.database === 'up'
                            ? <CheckCircle2 size={10} className="text-emerald-400" />
                            : <AlertCircle size={10} className="text-red-400" />
                        }
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5 opacity-70">
                            <Server size={10} />
                            <span>GeoServer</span>
                        </div>
                        {status?.components?.geoserver === 'up'
                            ? <CheckCircle2 size={10} className="text-emerald-400" />
                            : <AlertCircle size={10} className="text-red-400" />
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
