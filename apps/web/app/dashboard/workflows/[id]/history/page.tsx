'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { workflowClient } from '@/lib/services/workflow-client';
import { WorkflowExecution, Workflow } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

export default function WorkflowHistoryPage({ params }: { params: { id: string } }) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadData() {
    try {
      const workspaceId = 'default-workspace';
      const [wf, execs] = await Promise.all([
        workflowClient.get(params.id, workspaceId),
        workflowClient.getExecutions(params.id, workspaceId),
      ]);
      setWorkflow(wf);
      setExecutions(execs);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Loading history...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
           <h1 className="text-2xl font-bold text-stone-900">
             Run History: {workflow?.name}
           </h1>
           <p className="text-sm text-stone-500">
             View past executions and logs for this automation.
           </p>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white shadow-sm border-stone-200 bg-white">
        <ul role="list" className="divide-y divide-stone-200 divide-stone-200">
           {executions.length === 0 ? (
             <li className="p-12 text-center text-stone-500">No runs recorded yet.</li>
           ) : (
             executions.map((exec) => (
                <li key={exec.id} className="p-4 hover:bg-stone-50 hover:bg-stone-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(exec.status)}
                      <div>
                        <p className="text-sm font-medium text-stone-900 uppercase">
                          {exec.status}
                        </p>
                        <p className="text-xs text-stone-500">
                          Started {formatDistanceToNow(new Date(exec.startedAt))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-stone-500">
                      ID: {exec.id.slice(0, 8)}
                    </div>
                  </div>
                  
                  {/* Logs Preview */}
                  {exec.logs && exec.logs.length > 0 && (
                    <div className="mt-3 rounded bg-white p-3 font-mono text-xs text-emerald-600">
                       <div className="flex items-center gap-2 mb-2 text-stone-500">
                         <Terminal className="h-3 w-3" /> Logs
                       </div>
                       {exec.logs.map((log, i) => (
                         <div key={i} className="truncate">{log}</div>
                       ))}
                    </div>
                  )}
                </li>
             ))
           )}
        </ul>
      </div>
    </div>
  );
}
