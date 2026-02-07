import { ReactNode } from 'react';

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-xl">
        {children}
      </div>
    </main>
  );
}
