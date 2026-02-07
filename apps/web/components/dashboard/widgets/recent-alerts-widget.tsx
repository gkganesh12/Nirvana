'use client';

import { WidgetWrapper } from './widget-wrapper';
import { formatDistanceToNow } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  severity: string;
  status: string;
  lastSeenAt: string;
}

interface RecentAlertsWidgetProps {
  title: string;
  data: Alert[] | null;
  loading: boolean;
  error?: string | null;
}

const severityStyles: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-sky-50 text-sky-700 border-sky-200',
    INFO: 'bg-stone-100 text-stone-600 border-stone-200',
};

export function RecentAlertsWidget({ title, data, loading, error }: RecentAlertsWidgetProps) {
  return (
    <WidgetWrapper title={title} loading={loading} error={error} className="p-0">
      <div className="divide-y divide-stone-200">
        {data?.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-900">
                {alert.title}
              </p>
              <p className="text-xs text-stone-500">
                {formatDistanceToNow(new Date(alert.lastSeenAt))}
              </p>
            </div>
            <div className={`ml-4 rounded-full border px-2 py-0.5 text-xs font-medium ${severityStyles[alert.severity] || severityStyles.INFO}`}>
              {alert.severity}
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && !loading && !error && (
             <div className="flex h-32 items-center justify-center text-sm text-stone-500">
                No recent alerts
            </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
