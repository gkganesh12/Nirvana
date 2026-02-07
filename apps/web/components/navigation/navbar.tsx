'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { isSignedIn } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-[#FDFCF8]/95 backdrop-blur-lg shadow-sm border-b border-stone-200' 
        : 'bg-[#FDFCF8]/80 backdrop-blur-md border-b border-stone-100'
    }`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
             <Image 
               src="/logo.png" 
               alt="Nirvana" 
               width={isScrolled ? 48 : 64} 
               height={isScrolled ? 48 : 64} 
               className="relative object-contain transition-all duration-300" 
             />
          </div>
          <span className={`font-bold text-stone-900 transition-all duration-300 ${isScrolled ? 'text-lg' : 'text-xl'}`}>
            Nirvana
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#how-it-works" className="text-sm font-medium text-stone-600 hover:text-emerald-700 transition-colors">
            How It Works
          </Link>
          <Link href="#features" className="text-sm font-medium text-stone-600 hover:text-emerald-700 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-stone-600 hover:text-emerald-700 transition-colors">
            Pricing
          </Link>
          
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <Button asChild className="bg-stone-900 hover:bg-stone-800 text-white shadow-md shadow-stone-900/20">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-stone-700 hover:text-emerald-700 hover:bg-stone-50">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-stone-900 hover:bg-stone-800 text-white shadow-md shadow-stone-900/20">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="text-slate-700 w-6 h-6" /> : <Menu className="text-slate-700 w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-lg p-4 md:hidden shadow-lg">
          <div className="flex flex-col space-y-4">
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
              Pricing
            </Link>
             {isSignedIn ? (
              <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
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
