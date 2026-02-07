'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { dashboardClient } from '@/lib/services/dashboard-client';
import { CustomDashboard } from '@/types/dashboard';

export default function DashboardListPage() {
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboards();
  }, []);

  async function loadDashboards() {
    try {
      // In a real app, we'd get the workspace ID from context/auth
      const workspaceId = 'default-workspace'; 
      const data = await dashboardClient.list(workspaceId);
      setDashboards(data);
    } catch (error) {
      console.error('Failed to load dashboards:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const workspaceId = 'default-workspace';
      await dashboardClient.delete(id, workspaceId);
      setDashboards(dashboards.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      alert('Failed to delete dashboard');
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-stone-500">Loading dashboards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Custom Dashboards</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create and manage personalized monitoring views for your team.
          </p>
        </div>
        <Link
          href="/dashboard/analytics/custom/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Dashboard
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-stone-300 p-12 text-center border-stone-300">
          <h3 className="mt-2 text-sm font-medium text-stone-900">No dashboards</h3>
          <p className="mt-1 text-sm text-stone-500">
            Get started by creating a new custom dashboard.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/analytics/custom/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-blue-700"
            >
              Create Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="relative flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md border-stone-200 bg-white"
            >
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-stone-900">
                      <Link href={`/dashboard/analytics/custom/${dashboard.id}`} className="focus:outline-none">
                        <span aria-hidden="true" className="absolute inset-0" />
                        {dashboard.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {dashboard.description || 'No description provided'}
                    </p>
                  </div>
                  {dashboard.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 bg-blue-900 text-blue-200">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-stone-500">
                  <span>{dashboard.widgets.length} Widgets</span>
                  <span>Created by {dashboard.creator?.displayName || 'Unknown'}</span>
                </div>
              </div>
              <div className="flex border-t border-stone-200 bg-stone-50 border-stone-200 bg-stone-100/50">
                <div className="flex w-0 flex-1">
                  <Link
                    href={`/dashboard/analytics/custom/${dashboard.id}/edit`}
                    className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-2 border-r border-transparent py-4 text-sm font-semibold text-stone-900 hover:bg-stone-100 hover:bg-stone-100"
                  >
                    Edit
                  </Link>
                </div>
                <div className="flex w-0 flex-1">
                  <button
                    onClick={(e) => handleDelete(dashboard.id, e)}
                    className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 border-l border-transparent py-4 text-sm font-semibold text-red-600 hover:bg-red-50 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
