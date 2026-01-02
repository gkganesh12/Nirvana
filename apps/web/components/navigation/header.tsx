'use client';

import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SignalCraft</p>
        <p className="text-lg font-semibold">Operations Dashboard</p>
      </div>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
