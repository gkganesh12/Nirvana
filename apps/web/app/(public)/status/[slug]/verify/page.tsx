'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyStatusSubscription() {
  const params = useParams();
  const search = useSearchParams();
  const [message, setMessage] = useState('Verifying your subscription...');
  const slug = params.slug as string;

  useEffect(() => {
    const token = search.get('token');
    const email = search.get('email');
    if (!token || !email) {
      setMessage('Missing verification details.');
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `/api/status-pages/public/${slug}/verify?token=${token}&email=${encodeURIComponent(email)}`,
        );
        if (!res.ok) {
          setMessage('Verification failed.');
          return;
        }
        setMessage('Subscription confirmed. You will receive updates.');
      } catch {
        setMessage('Verification failed.');
      }
    };

    run();
  }, [search, slug]);

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md w-full">
        <h1 className="text-xl font-semibold text-stone-900">Status Updates</h1>
        <p className="mt-3 text-sm text-stone-600">{message}</p>
        <Link
          href={`/status/${slug}`}
          className="mt-6 inline-flex text-sm text-stone-700 hover:underline"
        >
          Back to status page
        </Link>
      </div>
    </main>
  );
}
