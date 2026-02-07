'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SeverityBadge } from './severity-badge';

interface CorrelatedAlert {
  id: string;
  title: string;
  severity: string;
  status: string;
  lastSeenAt: string;
}

export function CorrelatedAlertsCard({ alertId }: { alertId: string }) {
  const [correlatedAlerts, setCorrelatedAlerts] = useState<CorrelatedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCorrelations() {
      try {
        const res = await fetch(`/api/alert-groups/${alertId}/related`);
        if (res.ok) {
          const data = await res.json();
          setCorrelatedAlerts(data);
        }
      } catch (error) {
        console.error('Failed to fetch correlations', error);
      } finally {
        setLoading(false);
      }
    }

    if (alertId) {
      fetchCorrelations();
    }
  }, [alertId]);

  if (loading || correlatedAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
      <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-lg">🔗</span> Correlated Alerts
        <span className="text-xs font-normal text-stone-500 ml-2">
          (Alerts that frequently occur with this one)
        </span>
      </h3>
      
      <div className="space-y-3">
        {correlatedAlerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between p-3 bg-stone-100/80 rounded-lg group hover:bg-stone-100 transition-colors border border-stone-200">
            <div className="flex items-center gap-3">
              <SeverityBadge severity={alert.severity} className="shrink-0" />
              <div className="min-w-0">
                <Link 
                  href={`/dashboard/alerts/${alert.id}`}
                  className="font-medium text-stone-900 truncate hover:text-red-600 block transition-colors"
                >
                  {alert.title}
                </Link>
                <p className="text-xs text-stone-500">
                  Last seen {new Date(alert.lastSeenAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
