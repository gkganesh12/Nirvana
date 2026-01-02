import Link from 'next/link';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Inbox', href: '/dashboard' },
  { label: 'Routing Rules', href: '/dashboard/rules' },
  { label: 'Integrations', href: '/dashboard/integrations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col gap-6 border-r border-border bg-white/70 px-6 py-8 md:flex">
      <div>
        <p className="text-sm font-semibold text-primary">SignalCraft</p>
        <p className="text-xs text-muted-foreground">Phase 1 Shell</p>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
