'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
  defaultChannel?: string | null;
}

export function SlackIntegration() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/slack/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false }));
  }, []);

  const loadChannels = async () => {
    const res = await fetch('/api/integrations/slack/channels');
    if (res.ok) {
      setChannels(await res.json());
    }
  };

  const disconnect = async () => {
    setLoading(true);
    await fetch('/api/integrations/slack/disconnect', { method: 'POST' });
    setStatus({ connected: false });
    setLoading(false);
  };

  const setDefaultChannel = async (channelId: string) => {
    await fetch('/api/integrations/slack/default-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    });
    setStatus((prev) => (prev ? { ...prev, defaultChannel: channelId } : prev));
  };

  if (!status) {
    return (
      <Card className="bg-zinc-950 border-red-900/10">
        <CardHeader>
          <CardTitle className="text-white">Slack</CardTitle>
          <CardDescription className="text-zinc-500">Loading integration status...</CardDescription>
        </CardHeader>
        <CardContent>
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-red-900/10">
      <CardHeader>
        <CardTitle className="text-white">Slack</CardTitle>
        <CardDescription className="text-zinc-500">
          {status.connected
            ? `Connected to ${status.teamName ?? 'workspace'}`
            : 'Connect Slack to deliver alert notifications.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <a href="/api/integrations/slack/connect">Reconnect</a>
              </Button>
              <Button variant="outline" onClick={disconnect} disabled={loading} className="border-red-900/20 text-red-400 hover:bg-red-950/20 hover:text-red-300">
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
              <Button variant="secondary" onClick={loadChannels} className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                Load channels
              </Button>
              <Button 
                variant="default" 
                className="bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/integrations/slack/test', { method: 'POST' });
                    const data = await res.json();
                    if (res.ok) {
                      alert('Success: ' + data.message);
                    } else {
                      alert('Error: ' + data.message);
                    }
                  } catch (err) {
                    alert('Failed to send test alert');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                Send Test Alert
              </Button>
            </div>
            {channels.length > 0 && (
              <div className="grid gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setDefaultChannel(channel.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      status.defaultChannel === channel.id
                        ? 'border-red-600 bg-red-950/30 text-white shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    #{channel.name}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:scale-105">
            <a href="/api/integrations/slack/connect">Connect Slack</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
