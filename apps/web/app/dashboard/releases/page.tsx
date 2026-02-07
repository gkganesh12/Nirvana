'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReleaseItem {
  id: string;
  version: string;
  environment: string;
  project: string;
  commitSha: string | null;
  deployedAt: string;
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    version: '',
    environment: 'production',
    project: 'default',
    commitSha: '',
    deployedAt: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadReleases = async () => {
    try {
      const res = await fetch('/api/releases?limit=50');
      if (res.ok) {
        setReleases(await res.json());
      }
    } catch (err) {
      console.error('Failed to load releases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const handleSave = async () => {
    setMessage(null);
    try {
      const res = await fetch(editingId ? `/api/releases/${editingId}` : '/api/releases', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: form.version,
          environment: form.environment,
          project: form.project || 'default',
          commitSha: form.commitSha || undefined,
          deployedAt: form.deployedAt ? new Date(form.deployedAt).toISOString() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save release');
      }
      setMessage(editingId ? 'Release updated' : 'Release saved');
      setForm({
        version: '',
        environment: 'production',
        project: 'default',
        commitSha: '',
        deployedAt: '',
      });
      setEditingId(null);
      await loadReleases();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save release');
    }
  };

  const handleEdit = (release: ReleaseItem) => {
    setEditingId(release.id);
    setForm({
      version: release.version,
      environment: release.environment,
      project: release.project,
      commitSha: release.commitSha ?? '',
      deployedAt: new Date(release.deployedAt).toISOString().slice(0, 16),
    });
  };

  const handleDelete = async (releaseId: string) => {
    setMessage(null);
    try {
      const ok = window.confirm('Delete this release? This cannot be undone.');
      if (!ok) {
        return;
      }
      const res = await fetch(`/api/releases/${releaseId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete release');
      }
      setMessage('Release deleted');
      if (editingId === releaseId) {
        setEditingId(null);
        setForm({
          version: '',
          environment: 'production',
          project: 'default',
          commitSha: '',
          deployedAt: '',
        });
      }
      await loadReleases();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete release');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Releases</h1>
        <p className="text-stone-500">Track deployments and correlate incidents automatically.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
          <h2 className="text-lg font-semibold text-stone-900">
            {editingId ? 'Edit Release' : 'Add Release'}
          </h2>
          <div className="mt-4 grid gap-3">
            <Input
              placeholder="Version (e.g., v2.4.1)"
              value={form.version}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
            />
            <Input
              placeholder="Project (e.g., payments-api)"
              value={form.project}
              onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
            />
            <Input
              placeholder="Environment (production, staging)"
              value={form.environment}
              onChange={(e) => setForm((prev) => ({ ...prev, environment: e.target.value }))}
            />
            <Input
              placeholder="Commit SHA (optional)"
              value={form.commitSha}
              onChange={(e) => setForm((prev) => ({ ...prev, commitSha: e.target.value }))}
            />
            <Input
              type="datetime-local"
              value={form.deployedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, deployedAt: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSave}
                disabled={!form.version || !form.environment}
                className="bg-red-600 hover:bg-red-700 text-stone-900"
              >
                {editingId ? 'Update Release' : 'Save Release'}
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      version: '',
                      environment: 'production',
                      project: 'default',
                      commitSha: '',
                      deployedAt: '',
                    });
                  }}
                  className="border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </Button>
              )}
            </div>
            {message && <div className="text-sm text-stone-600">{message}</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Recent Releases</h2>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-stone-500">Loading releases...</div>
          ) : releases.length === 0 ? (
            <div className="mt-4 text-sm text-stone-500">No releases tracked yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="rounded-xl border border-stone-200 bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-sm text-stone-900">
                        <a href={`/dashboard/releases/${release.id}`} className="hover:underline">
                          {release.version}
                        </a>
                      </div>
                      <div className="text-xs text-stone-500">
                        {release.project} • {release.environment}
                      </div>
                    </div>
                    <div className="text-xs text-stone-500">
                      {new Date(release.deployedAt).toLocaleString()}
                    </div>
                  </div>
                  {release.commitSha && (
                    <div className="mt-2 text-xs text-stone-500">SHA: {release.commitSha}</div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-stone-200 text-stone-700 hover:bg-stone-50"
                      onClick={() => handleEdit(release)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(release.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
