'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StatusSubscribe({ slug }: { slug: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/status-pages/public/${slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to subscribe');
      }
      setMessage('Check your inbox to confirm your subscription.');
      setEmail('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="font-semibold text-stone-900">Get updates</div>
      <p className="mt-1 text-sm text-stone-500">Subscribe to incident updates by email.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={handleSubscribe}
          disabled={loading || !email}
          className="bg-stone-900 text-white hover:bg-stone-800"
        >
          {loading ? 'Submitting...' : 'Subscribe'}
        </Button>
      </div>
      {message && <div className="mt-3 text-sm text-stone-600">{message}</div>}
    </div>
  );
}
