'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface IntegrationStatus {
  configured: boolean;
  status?: string | null;
}

export function TeamsIntegration() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    const loadStatus = async () => {
      const res = await fetch('/api/integrations/teams/status');
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
      const res = await fetch('/api/integrations/teams/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Teams webhook test succeeded');
      } else {
        setMessage(data.error || 'Teams webhook test failed');
      }
    } catch (_error) {
      setMessage('Teams webhook test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/teams/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Teams integration saved');
        const statusRes = await fetch('/api/integrations/teams/status');
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
      } else {
        setMessage(data.error || 'Failed to save Teams integration');
      }
    } catch (_error) {
      setMessage('Failed to save Teams integration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-lg shadow-stone-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Microsoft Teams</h2>
          <p className="mt-1 text-sm text-stone-500">
            Send alerts into a Teams channel via incoming webhook.
          </p>
        </div>
        <span className="text-xs text-stone-500">
          {status?.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <Input
          placeholder="Teams webhook URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={loading}
            className="bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            {loading ? 'Testing...' : 'Test Webhook'}
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
