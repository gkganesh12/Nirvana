'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { workflowClient } from '@/lib/services/workflow-client';
import { Workflow } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  History
} from 'lucide-react';
// Ideally use a specialized simpler Table component or just HTML/Tailwind for speed in "Agentic Mode" unless UI lib is strict
// I'll use Tailwind tables for now to avoid complexity with missing shadcn components

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      const workspaceId = 'default-workspace';
      const data = await workflowClient.list(workspaceId);
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    try {
      const workspaceId = 'default-workspace';
      await workflowClient.toggle(id, workspaceId, !currentStatus);
      setWorkflows(workflows.map(w => 
        w.id === id ? { ...w, isEnabled: !currentStatus } : w
      ));
    } catch (error) {
       console.error('Failed to toggle workflow:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      const workspaceId = 'default-workspace';
      await workflowClient.delete(id, workspaceId);
      setWorkflows(workflows.filter(w => w.id !== id));
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Auto-Remediation Workflows</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Automate responses to alerts with conditional logic and actions.
          </p>
        </div>
        <Link href="/dashboard/workflows/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> New Workflow
          </Button>
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No workflows</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first automation workflow to handle alerts automatically.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/workflows/new">
              <Button>Create Workflow</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trigger</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Runs</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
              {workflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{workflow.name}</div>
                    <div className="text-sm text-gray-500">{workflow.description}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {workflow.trigger.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleToggle(workflow.id, workflow.isEnabled)}
                      className={workflow.isEnabled ? "text-green-600" : "text-gray-400"}
                    >
                      {workflow.isEnabled ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
                      {workflow.isEnabled ? 'Active' : 'Paused'}
                    </Button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {workflow.runCount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/workflows/${workflow.id}/history`}>
                         <Button size="icon" variant="ghost" title="Run History">
                           <History className="h-4 w-4 text-gray-500" />
                         </Button>
                      </Link>
                      <Link href={`/dashboard/workflows/${workflow.id}/edit`}>
                         <Button size="icon" variant="ghost" title="Edit">
                           <Edit className="h-4 w-4 text-blue-600" />
                         </Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(workflow.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
