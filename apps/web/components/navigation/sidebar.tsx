'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Inbox,
  GitBranch,
  Webhook,
  BarChart3,
  Settings,
  AlertTriangle,
  Bell,
  GitMerge,
  Activity,
  Calendar,
  Workflow,
  Globe,
  Package,
} from 'lucide-react';

const links = [
  { label: 'Overview', href: '/dashboard', icon: Inbox },
  { label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { label: 'Activity Feed', href: '/dashboard/activity', icon: Activity },
  { label: 'On-call Schedule', href: '/dashboard/on-call', icon: Calendar },
  { label: 'Routing Rules', href: '/dashboard/rules', icon: GitBranch },
  { label: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
  { label: 'Correlations', href: '/dashboard/correlations', icon: GitMerge },
  { label: 'Integrations', href: '/dashboard/integrations', icon: Webhook },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Notification Logs', href: '/dashboard/notification-logs', icon: Bell },
  { label: 'Status Page', href: '/dashboard/status-page', icon: Globe },
  { label: 'Releases', href: '/dashboard/releases', icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 flex-col gap-6 border-r border-stone-200 bg-[#FDFCF8] px-4 py-6 md:flex">
      <div className="flex-1 flex flex-col gap-6 px-2">
        <nav className="flex flex-col gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Platform
          </p>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-white text-stone-900 shadow-md shadow-stone-900/10 ring-1 ring-stone-200'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? 'text-red-600' : 'text-stone-400 group-hover:text-red-500',
                  )}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <nav className="flex flex-col gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Settings
          </p>
          <Link
            href="/dashboard/settings"
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900',
            )}
          >
            <Settings className="h-4 w-4 text-stone-400 group-hover:text-red-500" />
            Team Settings
          </Link>
        </nav>
      </div>
    </aside>
  );
}
