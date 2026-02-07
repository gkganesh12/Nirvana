'use client';

import { useEffect, useState } from 'react';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

interface ReleaseHealth {
  id: string;
  version: string;
  environment: string;
  project: string;
  deployedAt: string;
  errorCount: number;
  affectedUsers: number;
  deltaFromPrevious: number;
}

export function ReleaseHealthWidget() {
  const [releases, setReleases] = useState<ReleaseHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReleases() {
      try {
        const res = await fetch('/api/releases/health?limit=5');
        if (res.ok) {
          const data = await res.json();
          setReleases(data);
        }
      } catch (err) {
        console.error('Failed to fetch release health:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-stone-800">Release Health</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-stone-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-stone-800">Release Health</h3>
        </div>
        <p className="text-sm text-stone-500">No releases tracked yet.</p>
        <p className="mt-2 text-xs text-stone-400">
          Releases are automatically tracked from incoming error data.
        </p>
      </div>
    );
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-stone-800">Release Health</h3>
        </div>
        <span className="text-xs text-stone-500">Last 5 releases</span>
      </div>

      <div className="space-y-3">
        {releases.map((release, index) => (
          <div
            key={release.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              index === 0
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-stone-800">{release.version}</span>
                  {index === 0 && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Latest
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                  <span>{release.project}</span>
                  <span>•</span>
                  <span>{release.environment}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(release.deployedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-stone-800">
                  {release.errorCount} errors
                </div>
                <div className="text-xs text-stone-500">{release.affectedUsers} users</div>
              </div>

              {release.deltaFromPrevious !== 0 && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    release.deltaFromPrevious > 0
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {release.deltaFromPrevious > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {release.deltaFromPrevious > 0 ? '+' : ''}
                  {release.deltaFromPrevious}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
