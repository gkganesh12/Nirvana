'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ReleaseDetail {
  id: string;
  version: string;
  environment: string;
  project: string;
  commitSha: string | null;
  deployedAt: string;
  alertGroups: Array<{
    id: string;
    title: string;
    severity: string;
    environment: string;
    lastSeenAt: string;
  }>;
  _count: {
    alertGroups: number;
  };
}

export default function ReleaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/releases/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch release');
        }
        setRelease(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch release');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return <div className="text-stone-500">Loading release...</div>;
  }

  if (error || !release) {
    return (
      <div className="space-y-4">
        <div className="text-red-600">{error || 'Release not found'}</div>
        <Link href="/dashboard/releases">
          <Button className="bg-red-600 hover:bg-red-700 text-stone-900">Back to Releases</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{release.version}</h1>
          <p className="text-stone-500">
            {release.project} • {release.environment}
          </p>
        </div>
        <Link href="/dashboard/releases">
          <Button variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-50">
            Back to Releases
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/90 p-6">
        <div className="text-sm text-stone-500">Deployed At</div>
        <div className="font-medium text-stone-900">
          {new Date(release.deployedAt).toLocaleString()}
        </div>
        {release.commitSha && (
          <div className="mt-2 text-xs text-stone-500">SHA: {release.commitSha}</div>
        )}
        <div className="mt-4 text-sm text-stone-500">Alerts linked</div>
        <div className="text-2xl font-semibold text-stone-900">{release._count.alertGroups}</div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/90 p-6">
        <h2 className="text-lg font-semibold text-stone-900">Related Alerts</h2>
        {release.alertGroups.length === 0 ? (
          <div className="mt-3 text-sm text-stone-500">No alerts linked yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {release.alertGroups.map((alert) => (
              <Link
                key={alert.id}
                href={`/dashboard/alerts/${alert.id}`}
                className="block rounded-xl border border-stone-200 bg-white/80 p-4 hover:border-stone-300"
              >
                <div className="text-sm font-medium text-stone-900">{alert.title}</div>
                <div className="text-xs text-stone-500">
                  {alert.environment} • {alert.severity} •{' '}
                  {new Date(alert.lastSeenAt).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
