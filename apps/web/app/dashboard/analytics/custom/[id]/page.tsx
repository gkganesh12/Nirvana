'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { dashboardClient } from '@/lib/services/dashboard-client';
import { CustomDashboard, Widget } from '@/types/dashboard';
import { AlertCountWidget } from '@/components/dashboard/widgets/alert-count-widget';
import { AlertsBySeverityWidget } from '@/components/dashboard/widgets/alerts-by-severity-widget';
import { RecentAlertsWidget } from '@/components/dashboard/widgets/recent-alerts-widget';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowLeft, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ViewDashboardPage({ params }: { params: { id: string } }) {
  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [params.id]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const workspaceId = 'default-workspace';
      // Use the specific endpoint that gets both dashboard and data
      const response = await dashboardClient.getWidgetData(params.id, workspaceId);
      setDashboard(response.dashboard);
      
      // Transform array to map for easier lookup
      const dataMap: Record<string, any> = {};
      response.widgetData.forEach(item => {
        dataMap[item.id] = item.data;
      });
      setWidgetData(dataMap);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderWidget = (widget: Widget) => {
    const data = widgetData[widget.id];
    // Loading state is handled at page level mostly, but could be granular
    // If we have dashboard but no data yet (e.g. refreshing), keep old data or show loading specific
    
    switch (widget.type) {
      case 'alert_count':
        return <AlertCountWidget title={widget.title} data={data} loading={false} />;
      case 'alerts_by_severity':
        return <AlertsBySeverityWidget title={widget.title} data={data} loading={false} />;
      case 'recent_alerts':
        return <RecentAlertsWidget title={widget.title} data={data} loading={false} />;
      default:
        return (
          <div className="flex h-full items-center justify-center rounded-lg border bg-gray-50 p-4 text-gray-500">
            Unknown Widget Type: {widget.type}
          </div>
        );
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
           <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
           <p className="text-gray-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-center">
        <h1 className="text-2xl font-bold">Dashboard Not Found</h1>
        <p className="mt-2 text-gray-500">The dashboard you are looking for does not exist or you do not have permission to view it.</p>
        <Link href="/dashboard/analytics/custom" className="mt-4 inline-block text-blue-600 hover:underline">
          &larr; Back to Dashboards
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-50/50 p-6 min-h-screen dark:bg-black/20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
             <Link href="/dashboard/analytics/custom" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
               <ArrowLeft className="h-5 w-5 text-gray-500" />
             </Link>
             <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dashboard.name}</h1>
                {dashboard.description && (
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{dashboard.description}</p>
                )}
             </div>
          </div>
          <div className="flex items-center gap-3">
             {lastRefreshed && (
               <span className="text-xs text-gray-400">
                 Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
               </span>
             )}
             <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
               <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
               Refresh
             </Button>
             <Link href={`/dashboard/analytics/custom/${dashboard.id}/edit`}>
               <Button variant="outline" size="sm">
                 <Pencil className="mr-2 h-4 w-4" />
                 Edit Layout
               </Button>
             </Link>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
           {dashboard.widgets.map((widget) => (
             <div key={widget.id} className="h-80" style={{ 
                gridColumn: widget.w > 1 ? `span ${widget.w}` : undefined,
                gridRow: widget.h > 1 ? `span ${widget.h}` : undefined,
             }}>
                {renderWidget(widget)}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
