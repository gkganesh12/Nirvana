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
    <div className="min-h-screen bg-[#FBF8F2] flex flex-col items-center justify-center p-6 bg-[radial-gradient(900px_circle_at_10%_0%,_#ffffff_0%,_#fbf8f2_55%,_#f2ede4_100%)]">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white/90 p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Blur */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-200/50 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-200/50 blur-[100px] rounded-full"></div>

        <div className="relative text-center space-y-6">
          <div className="inline-block p-4 bg-white rounded-2xl border border-stone-200 shadow-inner">
            <Image src="/logo.png" alt="Nirvana" width={64} height={64} className="object-contain" />
          </div>

          {status === 'LOADING' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto" />
              <h1 className="text-xl font-bold text-stone-900">Joining Workspace...</h1>
              <p className="text-stone-500">Please wait while we set things up for you.</p>
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-stone-900">Welcome to {invitationData?.workspace?.name || 'the team'}!</h1>
              <p className="text-stone-500">You have successfully joined the workspace. Redirecting you to the dashboard...</p>
              <Button onClick={() => router.push('/dashboard')} className="w-full bg-red-600 hover:bg-red-700 text-white">
                Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-200">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-stone-900">Invitation Error</h1>
              <p className="text-stone-500 text-sm leading-relaxed">{error}</p>
              <div className="pt-4 flex flex-col gap-3">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full border-stone-200 text-stone-700 hover:bg-stone-100">
                    Return to Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full text-stone-500 hover:text-stone-900">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'IDLE' && token && (
             <div className="space-y-4">
               <Mail className="w-12 h-12 text-stone-500 mx-auto" />
               <h1 className="text-xl font-bold text-stone-900">Accept Invitation</h1>
               <p className="text-stone-500">You&apos;ve been invited to join a workspace on Nirvana.</p>
               <Button onClick={verifyToken} className="w-full bg-red-600 hover:bg-red-700 text-white">
                 Confirm Join
               </Button>
             </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-stone-500 text-xs">
        &copy; {new Date().getFullYear()} Nirvana. All rights reserved.
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
