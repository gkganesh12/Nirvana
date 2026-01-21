'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { dark } from '@clerk/themes';
import { useState, useEffect } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between border-b border-red-900/20 bg-black px-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Operations Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        <NotificationsDropdown />
        <div className="h-6 w-px bg-red-900/20" />
        <UserButton 
          afterSignOutUrl="/" 
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#dc2626', // red-600
              colorBackground: '#09090b', // zinc-950
              colorText: '#ffffff',
              colorTextSecondary: '#a1a1aa', // zinc-400
            },
            elements: {
              userButtonPopoverCard: 'border border-white/10 shadow-xl',
              userButtonPopoverFooter: 'hidden',
              avatarBox: 'h-9 w-9 ring-2 ring-white/10 hover:ring-red-500/50 transition-all',
            }
          }}
        />
      </div>
    </header>
  );
}

function NotificationsDropdown() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    fetch('/api/alert-groups?status=OPEN&severity=CRITICAL,HIGH&limit=5')
      .then(res => res.json())
      .then(data => {
        if (data && data.groups) {
          setAlerts(data.groups);
          setHasNew(data.groups.length > 0);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative text-red-500/60 hover:text-red-400 transition-colors outline-none">
           <Bell className="h-5 w-5" />
           {hasNew && (
             <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600 ring-2 ring-black animate-pulse" />
           )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-950 border-white/10 text-white">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">Notifications</p>
            <p className="text-xs leading-none text-zinc-400">
              Recent critical & high priority alerts
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        {loading ? (
          <div className="p-4 text-center text-xs text-zinc-500">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500">No new alerts</div>
        ) : (
          alerts.map(alert => (
            <DropdownMenuItem key={alert.id} className="focus:bg-zinc-900 focus:text-white cursor-pointer" asChild>
              <Link href={`/dashboard/alerts/${alert.id}`} className="flex flex-col items-start gap-1 py-3 px-3">
                <div className="flex items-center gap-2 w-full">
                  <span className={`h-2 w-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`} />
                  <span className="font-semibold text-xs truncate flex-1">{alert.title}</span>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                    {new Date(alert.lastSeenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 pl-4">
                  {alert.environment} • {alert.project}
                </p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem className="focus:bg-zinc-900 focus:text-white cursor-pointer justify-center text-xs text-zinc-500 hover:text-white" asChild>
          <Link href="/dashboard/alerts">View all alerts</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
