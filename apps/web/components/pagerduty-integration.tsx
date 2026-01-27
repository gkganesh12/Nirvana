'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface IntegrationStatus {
  configured: boolean;
  status?: string | null;
}

export function PagerDutyIntegration() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ apiKey: '', serviceId: '' });

  useEffect(() => {
    const loadStatus = async () => {
      const res = await fetch('/api/integrations/pagerduty/status');
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
      const res = await fetch('/api/integrations/pagerduty/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('PagerDuty connection successful');
      } else {
        setMessage(data.error || 'PagerDuty connection failed');
      }
    } catch (_error) {
      setMessage('PagerDuty connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/pagerduty/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('PagerDuty integration saved');
        const statusRes = await fetch('/api/integrations/pagerduty/status');
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
      } else {
        setMessage(data.error || 'Failed to save PagerDuty integration');
      }
    } catch (_error) {
      setMessage('Failed to save PagerDuty integration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-lg shadow-stone-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">PagerDuty</h2>
          <p className="mt-1 text-sm text-stone-500">
            Create PagerDuty incidents for matched alerts.
          </p>
        </div>
        <span className="text-xs text-stone-500">
          {status?.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <Input
          placeholder="PagerDuty API token"
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        />
        <Input
          placeholder="Service ID"
          value={form.serviceId}
          onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
        />
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
