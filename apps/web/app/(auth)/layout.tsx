import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AuthBodyStyle } from './_components/auth-body-style';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F2] text-stone-900">
      <AuthBodyStyle />
      <div className="flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
           <Image src="/logo.png" width={64} height={64} className="object-contain" alt="Logo" />
           <span className="text-lg font-bold tracking-tight text-stone-900 transition-colors hover:text-red-600">Nirvana</span>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
