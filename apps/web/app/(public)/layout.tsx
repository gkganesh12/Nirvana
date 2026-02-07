import { ReactNode } from 'react';
import { Navbar } from '@/components/navigation/navbar';
import Link from 'next/link';
import { Twitter, Linkedin, Github } from 'lucide-react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Navbar />
      <div className="pt-20">
        {children}
      </div>
      
      {/* Professional Footer */}
      <footer className="border-t border-stone-200 bg-[#FDFCF8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 py-16">
            {/* Company */}
            <div>
              <h3 className="font-bold text-stone-900 mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">About Us</Link></li>
                <li><Link href="/blog" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Blog</Link></li>
                <li><Link href="/careers" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Careers</Link></li>
                <li><Link href="/contact" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Contact</Link></li>
              </ul>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-bold text-stone-900 mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Features</Link></li>
                <li><Link href="#pricing" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Pricing</Link></li>
                <li><Link href="/integrations" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Integrations</Link></li>
                <li><Link href="/changelog" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Changelog</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-bold text-stone-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link href="https://github.com/gkganesh12/SignalCraft" target="_blank" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Documentation</Link></li>
                <li><Link href="https://github.com/gkganesh12/SignalCraft" target="_blank" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">API Reference</Link></li>
                <li><Link href="https://github.com/gkganesh12/SignalCraft" target="_blank" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Guides</Link></li>
                <li><Link href="https://github.com/gkganesh12/SignalCraft" target="_blank" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Support</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold text-stone-900 mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Terms of Service</Link></li>
                <li><Link href="/security" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Security</Link></li>
                <li><Link href="/compliance" className="text-stone-600 hover:text-emerald-700 transition-colors text-sm">Compliance</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-stone-200 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-stone-600">
              © {new Date().getFullYear()} Nirvana. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
              <Link 
                href="https://twitter.com/nirvana" 
                target="_blank"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link 
                href="https://linkedin.com/company/nirvana" 
                target="_blank"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link 
                href="https://github.com/gkganesh12/SignalCraft" 
                target="_blank"
                className="text-stone-400 hover:text-stone-900 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
