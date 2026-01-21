import { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
           <img src="/logo.png" className="h-8 w-8 object-contain" alt="Logo" />
           <span className="text-lg font-bold tracking-tight text-white hover:text-red-500 transition-colors">SignalCraft</span>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
