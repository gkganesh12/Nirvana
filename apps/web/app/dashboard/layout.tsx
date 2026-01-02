import { ReactNode } from 'react';
import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { Header } from '@/components/navigation/header';
import { Sidebar } from '@/components/navigation/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = auth();
  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
