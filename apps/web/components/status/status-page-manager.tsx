'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StatusPage {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  isActive: boolean;
}

interface StatusIncident {
  id: string;
  title: string;
  status: string;
  impact: string;
  message: string | null;
  updatedAt: string;
}

const statusOptions = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'];
const impactOptions = ['NONE', 'MINOR', 'MAJOR', 'CRITICAL'];

export function StatusPageManager() {
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [activePage, setActivePage] = useState<StatusPage | null>(null);
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newPage, setNewPage] = useState({ slug: '', title: '', description: '' });
  const [newIncident, setNewIncident] = useState({
    title: '',
    status: 'INVESTIGATING',
    impact: 'MINOR',
    message: '',
  });

  const loadPages = async () => {
    const res = await fetch('/api/status-pages');
    if (res.ok) {
      const data = await res.json();
      setPages(data);
      if (!activePage && data.length) {
        setActivePage(data[0]);
      }
    }
  };

  const loadIncidents = async (pageId: string) => {
    const res = await fetch(`/api/status-pages/${pageId}/incidents`);
    if (res.ok) {
      setIncidents(await res.json());
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (activePage) {
      loadIncidents(activePage.id);
    }
  }, [activePage?.id]);

  const handleCreatePage = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/status-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPage),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create page');
      setMessage('Status page created');
      setNewPage({ slug: '', title: '', description: '' });
      await loadPages();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!activePage) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/status-pages/${activePage.id}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIncident),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish incident');
      setMessage('Incident published');
      setNewIncident({ title: '', status: 'INVESTIGATING', impact: 'MINOR', message: '' });
      await loadIncidents(activePage.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to publish incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-stone-900">Status Page</h2>
        <p className="text-sm text-stone-500 mt-1">
          Configure a public status page for customer updates.
        </p>

        {pages.length === 0 ? (
          <div className="mt-6 grid gap-4">
            <Input
              placeholder="slug (e.g., acme-status)"
              value={newPage.slug}
              onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
            />
            <Input
              placeholder="Status page title"
              value={newPage.title}
              onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newPage.description}
              onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
            />
            <Button
              onClick={handleCreatePage}
              disabled={loading || !newPage.slug || !newPage.title}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              {loading ? 'Creating...' : 'Create Status Page'}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="text-sm text-stone-600">
              Active page: <span className="font-semibold">{activePage?.title}</span>
            </div>
            <div className="text-xs text-stone-500">/{activePage?.slug}</div>
            {activePage?.slug && (
              <a
                href={`/status/${activePage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-xs text-stone-600 hover:underline"
              >
                View public status page
              </a>
            )}
          </div>
        )}

        {message && <div className="mt-4 text-sm text-stone-600">{message}</div>}
      </div>

      {activePage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
            <h3 className="font-semibold text-stone-900">Publish Incident</h3>
            <div className="mt-4 grid gap-3">
              <Input
                placeholder="Incident title"
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
              />
              <select
                value={newIncident.status}
                onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={newIncident.impact}
                onChange={(e) => setNewIncident({ ...newIncident, impact: e.target.value })}
                className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              >
                {impactOptions.map((impact) => (
                  <option key={impact} value={impact}>
                    {impact}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Message"
                value={newIncident.message}
                onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
              />
              <Button
                onClick={handleCreateIncident}
                disabled={loading || !newIncident.title}
                className="bg-stone-900 text-white hover:bg-stone-800"
              >
                {loading ? 'Publishing...' : 'Publish Update'}
              </Button>
            </div>
          </div>

          <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
            <h3 className="font-semibold text-stone-900">Recent Incidents</h3>
            <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
              {incidents.length === 0 ? (
                <div className="text-sm text-stone-500">No incidents published yet.</div>
              ) : (
                incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border border-stone-200 bg-white/70 p-3"
                  >
                    <div className="text-sm font-medium text-stone-800">{incident.title}</div>
                    <div className="text-xs text-stone-500">
                      {incident.status} • {incident.impact} •{' '}
                      {new Date(incident.updatedAt).toLocaleString()}
                    </div>
                    {incident.message && (
                      <div className="text-xs text-stone-500 mt-1">{incident.message}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
