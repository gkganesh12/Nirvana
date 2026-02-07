'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface AnomalyAlert {
    alertGroupId: string;
    title: string;
    severity: string;
    currentVelocity: number;
    baselineVelocity: number;
    percentageIncrease: number;
    detectedAt: string;
}

const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-sky-50 text-sky-700 border-sky-200',
    INFO: 'bg-stone-100 text-stone-500 border-stone-200',
};

export function AnomalyAlertWidget() {
    const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnomalies() {
            try {
                const res = await fetch('/api/alert-groups/anomalies');
                if (res.ok) {
                    const data = await res.json();
                    setAnomalies(data);
                }
            } catch (err) {
                console.error('Failed to fetch anomalies:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAnomalies();

        // Refresh every 2 minutes
        const interval = setInterval(fetchAnomalies, 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 to-amber-50 p-6 shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                    <h3 className="font-semibold text-stone-800">Anomaly Detection</h3>
                </div>
                <div className="animate-pulse space-y-2">
                    <div className="h-8 rounded bg-red-100/70"></div>
                    <div className="h-8 w-3/4 rounded bg-amber-100/70"></div>
                </div>
            </div>
        );
    }

    if (anomalies.length === 0) {
        return (
            <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-semibold text-stone-800">Anomaly Detection</h3>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                        All Normal
                    </span>
                </div>
                <p className="text-sm text-stone-500">No anomalies detected. Error rates are within normal bounds.</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 to-amber-50 p-6 shadow-lg shadow-stone-900/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                    <h3 className="font-semibold text-stone-800">Anomaly Detection</h3>
                </div>
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 animate-pulse">
                    {anomalies.length} Detected
                </span>
            </div>

            <div className="space-y-3">
                {anomalies.slice(0, 5).map((anomaly) => (
                    <Link
                        key={anomaly.alertGroupId}
                        href={`/dashboard/alerts/${anomaly.alertGroupId}`}
                        className="block rounded-xl border border-stone-200 bg-white/90 p-3 transition-colors hover:border-stone-300 hover:bg-stone-50/70"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="max-w-[60%] truncate text-sm font-medium text-stone-800">
                                {anomaly.title}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${severityColors[anomaly.severity] || severityColors.INFO}`}>
                                {anomaly.severity}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1 text-red-600">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{Math.round(anomaly.percentageIncrease)}%</span>
                            </div>
                            <span className="text-stone-500">
                                {anomaly.currentVelocity.toFixed(1)}/hr (baseline: {anomaly.baselineVelocity.toFixed(1)}/hr)
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {anomalies.length > 5 && (
                <div className="mt-3 text-center">
                    <Link href="/dashboard/alerts" className="text-xs text-red-600 hover:text-red-500">
                        View all {anomalies.length} anomalies →
                    </Link>
                </div>
            )}
        </div>
    );
}
