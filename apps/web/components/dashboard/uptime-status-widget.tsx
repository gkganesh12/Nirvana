'use client';

import { useEffect, useState } from 'react';
import { Activity, ArrowUpCircle, ArrowDownCircle, Clock, Zap } from 'lucide-react';

interface UptimeCheck {
    id: string;
    name: string;
    url: string;
    method: string;
    interval: number;
    enabled: boolean;
    lastStatus: string | null;
    lastCheckedAt: string | null;
    uptimePercentage: number;
    avgResponseTime: number | null;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    up: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        icon: <ArrowUpCircle className="w-4 h-4 text-emerald-600" />,
    },
    down: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        icon: <ArrowDownCircle className="w-4 h-4 text-red-600" />,
    },
    degraded: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: <Clock className="w-4 h-4 text-amber-600" />,
    },
};

export function UptimeStatusWidget() {
    const [checks, setChecks] = useState<UptimeCheck[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchChecks() {
            try {
                const res = await fetch('/api/uptime/checks');
                if (res.ok) {
                    const data = await res.json();
                    setChecks(data);
                }
            } catch (err) {
                console.error('Failed to fetch uptime checks:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchChecks();

        // Refresh every 30 seconds
        const interval = setInterval(fetchChecks, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-stone-800">Uptime Monitoring</h3>
                </div>
                <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-xl bg-stone-100"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (checks.length === 0) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-stone-800">Uptime Monitoring</h3>
                </div>
                <div className="text-center py-4">
                    <p className="text-sm text-stone-500">No uptime checks configured.</p>
                    <p className="mt-1 text-xs text-stone-400">
                        Add endpoint monitors to track service availability.
                    </p>
                </div>
            </div>
        );
    }

    const allUp = checks.every((c) => c.lastStatus === 'up' || c.lastStatus === null);
    const anyDown = checks.some((c) => c.lastStatus === 'down');

    return (
        <div className={`rounded-2xl border p-6 shadow-lg shadow-stone-900/5 ${
            anyDown 
                ? 'border-red-200/60 bg-gradient-to-r from-red-50 to-amber-50' 
                : 'border-stone-200 bg-white/90'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-stone-800">Uptime Monitoring</h3>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs ${
                    allUp 
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                        : anyDown 
                            ? 'border-red-200 bg-red-50 text-red-700' 
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                    {allUp ? 'All Systems Operational' : anyDown ? 'System Issues' : 'Degraded'}
                </span>
            </div>

            <div className="space-y-2">
                {checks.map((check) => {
                    const statusStyle = statusColors[check.lastStatus ?? 'up'] ?? statusColors.up;
                    
                    return (
                        <div
                            key={check.id}
                            className={`flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 ${statusStyle.bg}`}
                        >
                            <div className="flex items-center gap-3">
                                {statusStyle.icon}
                                <div>
                                    <p className="text-sm font-medium text-stone-800">{check.name}</p>
                                    <p className="max-w-[200px] truncate text-xs text-stone-500">{check.url}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <p className={`text-sm font-medium ${statusStyle.text}`}>
                                        {check.uptimePercentage}%
                                    </p>
                                    <p className="text-xs text-stone-500">uptime</p>
                                </div>
                                {check.avgResponseTime && (
                                    <div className="flex items-center gap-1 text-stone-500">
                                        <Zap className="w-3 h-3" />
                                        <span className="text-xs">{check.avgResponseTime}ms</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
