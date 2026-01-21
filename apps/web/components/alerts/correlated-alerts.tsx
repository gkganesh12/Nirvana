'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  GitMerge, 
  ArrowRight, 
  Search 
} from 'lucide-react';

interface CorrelatedAlertsProps {
  alertId: string;
}

interface AlertCorrelation {
  id: string;
  relatedAlertId: string;
  correlationScore: number;
  reason: string;
  relatedAlert: {
    id: string;
    title: string;
    severity: string;
    status: string;
    environment: string;
  };
}

interface RootCauseAnalysis {
  rootCauseAlertId: string;
  confidence: number;
  explanation: string;
}

export function CorrelatedAlerts({ alertId }: CorrelatedAlertsProps) {
  const [correlations, setCorrelations] = useState<AlertCorrelation[]>([]);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [corrRes, rootRes] = await Promise.all([
          fetch(`/api/alerts/${alertId}/correlations`),
          fetch(`/api/alerts/${alertId}/root-cause`)
        ]);

        if (corrRes.ok) {
          setCorrelations(await corrRes.json());
        }
        
        if (rootRes.ok) {
          setRootCause(await rootRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch correlation data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [alertId]);

  if (loading) return <div className="animate-pulse h-24 bg-muted/50 rounded-md"></div>;

  if (correlations.length === 0) return null;

  return (
    <div className="space-y-6 border rounded-lg p-6 bg-card">
      <div className="flex items-center gap-2 mb-4">
        <GitMerge className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Correlated Incidents</h3>
        <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">
          {correlations.length} Related
        </span>
      </div>

      {rootCause && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 mb-6">
          <div className="flex gap-3">
            <Search className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-500 mb-1">
                Potential Root Cause Detected
                <span className="ml-2 text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded">
                  {Math.round(rootCause.confidence * 100)}% Confidence
                </span>
              </div>
              <p className="text-sm text-yellow-500/90">{rootCause.explanation}</p>
              {rootCause.rootCauseAlertId !== alertId && (
                 <Link href={`/dashboard/alerts/${rootCause.rootCauseAlertId}`} className="text-sm text-yellow-500 underline mt-2 inline-block">
                    View Root Cause Alert →
                 </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {correlations.map((corr) => (
          <div key={corr.id} className="flex items-start justify-between p-3 rounded-md border bg-background/50 hover:bg-background transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  corr.relatedAlert.severity === 'CRITICAL' ? 'bg-red-500' :
                  corr.relatedAlert.severity === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
                <Link href={`/dashboard/alerts/${corr.relatedAlert.id}`} className="font-medium hover:underline">
                  {corr.relatedAlert.title}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                {corr.reason} • {corr.relatedAlert.environment}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-muted-foreground mb-1">
                Score: {corr.correlationScore.toFixed(2)}
              </div>
              <Link href={`/dashboard/alerts/${corr.relatedAlert.id}`}>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  View <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
