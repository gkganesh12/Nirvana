'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard/settings/workspace', label: 'Workspace', icon: '🏢' },
  { href: '/dashboard/settings/users', label: 'Users', icon: '👥' },
  { href: '/dashboard/settings/notifications', label: 'Notifications', icon: '🔔' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 shrink-0">
        <nav className="bg-zinc-950 border border-red-900/10 rounded-xl p-4 sticky top-24">
          <h2 className="font-semibold text-white mb-4">Settings</h2>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-red-900/20 text-red-400 font-medium border border-red-900/20'
                      : 'text-zinc-500 hover:bg-zinc-900 hover:text-red-300'
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
