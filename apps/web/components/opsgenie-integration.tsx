'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface IntegrationStatus {
  configured: boolean;
  status?: string | null;
}

export function OpsgenieIntegration() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ apiKey: '', region: 'us' });

  useEffect(() => {
    const loadStatus = async () => {
      const res = await fetch('/api/integrations/opsgenie/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    };
    loadStatus();
  }, []);

  const handleTest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/opsgenie/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Opsgenie connection successful');
      } else {
        setMessage(data.error || 'Opsgenie connection failed');
      }
    } catch (_error) {
      setMessage('Opsgenie connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/opsgenie/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Opsgenie integration saved');
        const statusRes = await fetch('/api/integrations/opsgenie/status');
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
      } else {
        setMessage(data.error || 'Failed to save Opsgenie integration');
      }
    } catch (_error) {
      setMessage('Failed to save Opsgenie integration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-lg shadow-stone-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Opsgenie</h2>
          <p className="mt-1 text-sm text-stone-500">Create Opsgenie alerts for matched rules.</p>
        </div>
        <span className="text-xs text-stone-500">
          {status?.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <Input
          placeholder="Opsgenie API key"
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        />
        <select
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="us">US</option>
          <option value="eu">EU</option>
        </select>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={loading}
            className="bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-stone-900"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {message && <div className="text-sm text-stone-600">{message}</div>}
      </div>
    </div>
  );
}
