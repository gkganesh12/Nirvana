import { ReactNode } from 'react';
import { Navbar } from '@/components/navigation/navbar';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-20">
        {children}
      </div>
      <footer className="border-t border-red-900/20 bg-black py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} SignalCraft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
