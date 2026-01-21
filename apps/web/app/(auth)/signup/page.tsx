'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-white/80 p-8 shadow-xl">
        <SignUp appearance={{ elements: { card: 'shadow-none bg-transparent' } }} />
      </div>
    </main>
  );
}
