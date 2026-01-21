'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { isSignedIn } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-red-900/30 bg-black backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="absolute inset-0 bg-red-600 blur opacity-20 hover:opacity-40 transition-opacity"></div>
             <Image src="/logo.png" alt="SignalCraft" width={40} height={40} className="relative object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SignalCraft</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors">
            Pricing
          </Link>
          <Link href="https://github.com/gkganesh12/SignalCraft" target="_blank" className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors">
            GitHub
          </Link>
          
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="text-white" /> : <Menu className="text-white" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="border-t border-white/10 bg-black p-4 md:hidden">
          <div className="flex flex-col space-y-4">
            <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>
              Pricing
            </Link>
             {isSignedIn ? (
              <Button asChild className="w-full">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
