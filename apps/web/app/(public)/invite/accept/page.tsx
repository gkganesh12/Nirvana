'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface InvitationData {
  workspace?: {
    name: string;
  };
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  const verifyToken = async () => {
    setStatus('LOADING');
    try {
      const res = await fetch(`/api/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvitationData(data);
        setStatus('SUCCESS');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        const err = await res.json();
        setError(err.message || 'The invitation is invalid, has expired, or has already been used.');
        setStatus('ERROR');
      }
    } catch (err) {
      console.error('Acceptance error:', err);
      setError('An unexpected error occurred. Please try again later.');
      setStatus('ERROR');
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setStatus('ERROR');
      setError('Invalid or missing invitation token.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);



  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 bg-[url('/grid.svg')] bg-center">
      <div className="w-full max-w-md bg-zinc-900/50 border border-white/5 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Decorative Blur */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-900/10 blur-[100px] rounded-full"></div>

        <div className="relative text-center space-y-6">
          <div className="inline-block p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            <Image src="/logo.png" alt="SignalCraft" width={48} height={48} className="object-contain" />
          </div>

          {status === 'LOADING' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto" />
              <h1 className="text-xl font-bold text-white">Joining Workspace...</h1>
              <p className="text-zinc-400">Please wait while we set things up for you.</p>
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-xl font-bold text-white">Welcome to {invitationData?.workspace?.name || 'the team'}!</h1>
              <p className="text-zinc-400">You have successfully joined the workspace. Redirecting you to the dashboard...</p>
              <Button onClick={() => router.push('/dashboard')} className="w-full bg-red-600 hover:bg-red-700 text-white">
                Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <h1 className="text-xl font-bold text-white">Invitation Error</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">{error}</p>
              <div className="pt-4 flex flex-col gap-3">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                    Return to Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full text-zinc-500 hover:text-white">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'IDLE' && token && (
             <div className="space-y-4">
               <Mail className="w-12 h-12 text-zinc-600 mx-auto" />
               <h1 className="text-xl font-bold text-white">Accept Invitation</h1>
               <p className="text-zinc-400">You&apos;ve been invited to join a workspace on SignalCraft.</p>
               <Button onClick={verifyToken} className="w-full bg-red-600 hover:bg-red-700 text-white">
                 Confirm Join
               </Button>
             </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-zinc-600 text-xs">
        &copy; {new Date().getFullYear()} SignalCraft. All rights reserved.
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
