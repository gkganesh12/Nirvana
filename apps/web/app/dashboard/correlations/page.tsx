'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { correlationClient } from '@/lib/services/correlation-client';
import { CorrelationGroup } from '@/types/correlation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CorrelationGroupsPage() {
  const [groups, setGroups] = useState<CorrelationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const workspaceId = 'default-workspace';
      const data = await correlationClient.listGroups(workspaceId);
      setGroups(data);
    } catch (error) {
      console.error('Failed to load correlation groups:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading correlations...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Correlation Groups</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
             Intelligent grouping of related alerts to reduce noise.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id} className="relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
             <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between">
                   <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">
                         <Layers className="h-4 w-4" />
                      </div>
                      <div>
                         <h3 className="font-medium text-gray-900 dark:text-gray-100">Group #{group.id.slice(0, 6)}</h3>
                         <p className="text-xs text-gray-500">
                           {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}
                         </p>
                      </div>
                   </div>
                   <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${group.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {group.status}
                   </span>
                </div>
                
                <div className="mt-4 space-y-3">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Primary Alert</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200 truncate max-w-[150px]">
                        {group.primaryAlertId}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Related Alerts</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">
                        {group.relatedAlertIds.length}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Confidence</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {(group.confidenceScore * 100).toFixed(0)}%
                      </span>
                   </div>
                </div>
                
                {group.rootCauseAnalysis && (
                   <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <strong>AI Analysis:</strong> {group.rootCauseAnalysis}
                   </div>
                )}
             </div>
             
             <div className="bg-gray-50 px-6 py-4 dark:bg-gray-800/50">
                <Link href={`/dashboard/alerts/${group.primaryAlertId}`} className="flex items-center justify-end text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                   View Incident <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
             </div>
          </div>
        ))}

        {groups.length === 0 && (
           <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center text-gray-500 dark:border-gray-700">
              No correlation groups active.
           </div>
        )}
      </div>
    </div>
  );
}
