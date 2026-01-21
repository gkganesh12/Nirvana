'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Inbox, GitBranch, Webhook, BarChart3, Settings, AlertTriangle, Bell, GitMerge } from 'lucide-react';

const links = [
  { label: 'Overview', href: '/dashboard', icon: Inbox },
  { label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { label: 'Routing Rules', href: '/dashboard/rules', icon: GitBranch },
  { label: 'Correlations', href: '/dashboard/correlations', icon: GitMerge },
  { label: 'Integrations', href: '/dashboard/integrations', icon: Webhook },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Notification Logs', href: '/dashboard/notification-logs', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col gap-6 border-r border-red-900/20 bg-black px-4 py-6 md:flex h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="px-2">
         {/* Team Switcher Placeholder */}
         <div className="flex items-center gap-3 rounded-lg bg-red-950/10 px-3 py-2 border border-red-900/20 hover:bg-red-900/20 transition-colors cursor-pointer group">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black border border-red-900/30 group-hover:border-red-500/50 transition-colors">
              <img src="/logo.png" alt="Team Logo" className="h-6 w-6 object-contain" />
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-medium text-white">SignalCraft</span>
               <span className="text-xs text-red-500/60">Free Team</span>
            </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 px-2">
        <nav className="flex flex-col gap-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">Platform</p>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300',
                  isActive 
                    ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                    : 'text-gray-500 hover:bg-red-950/20 hover:text-red-400'
                )}
              >
                <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-white" : "text-gray-500 group-hover:text-red-400")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <nav className="flex flex-col gap-1">
           <p className="px-2 text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">Settings</p>
           <Link
              href="/dashboard/settings"
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-500 hover:bg-red-950/20 hover:text-red-400'
              )}
            >
              <Settings className="h-4 w-4 text-gray-500 group-hover:text-red-400" />
              Team Settings
            </Link>
        </nav>
      </div>
    </aside>
  );
}
