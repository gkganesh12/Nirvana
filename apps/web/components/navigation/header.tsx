'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
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

import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-[65px] items-center justify-between border-b border-stone-200 bg-white/80 px-6 backdrop-blur">
      <div>
         <div className="group flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-1.5 transition-colors hover:border-stone-300 hover:bg-stone-50/70">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 transition-colors group-hover:border-red-300/70">
              <Image src="/logo.png" alt="Team Logo" width={24} height={24} className="object-contain" />
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-medium text-stone-800">Nirvana</span>
               <span className="text-xs text-stone-500">Free Team</span>
            </div>
         </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationsDropdown />
        <div className="h-6 w-px bg-stone-200" />
        <UserButton 
          afterSignOutUrl="/" 
          appearance={{
            variables: {
              colorPrimary: '#dc2626', // red-600
              colorBackground: '#ffffff',
              colorText: '#1c1917',
              colorTextSecondary: '#78716c',
            },
            elements: {
              userButtonPopoverCard: 'border border-stone-200 shadow-xl',
              userButtonPopoverFooter: 'hidden',
              avatarBox: 'h-9 w-9 ring-2 ring-stone-200 hover:ring-red-400/50 transition-all',
            }
          }}
        />
      </div>
    </header>
  );
}

interface AlertGroup {
  id: string;
  title: string;
  severity: string;
  environment: string;
  project: string;
  lastSeenAt: string;
}

function NotificationsDropdown() {
  const [alerts, setAlerts] = useState<AlertGroup[]>([]);
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
        <button className="relative text-stone-500 transition-colors outline-none hover:text-red-600">
           <Bell className="h-5 w-5" />
           {hasNew && (
             <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
           )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-stone-200 bg-white text-stone-900 shadow-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-stone-900">Notifications</p>
            <p className="text-xs leading-none text-stone-500">
              Recent critical & high priority alerts
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-stone-200" />
        
        {loading ? (
          <div className="p-4 text-center text-xs text-stone-500">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-center text-xs text-stone-500">No new alerts</div>
        ) : (
          alerts.map(alert => (
            <DropdownMenuItem key={alert.id} className="cursor-pointer focus:bg-stone-50 focus:text-stone-900" asChild>
              <Link href={`/dashboard/alerts/${alert.id}`} className="flex flex-col items-start gap-1 py-3 px-3">
                <div className="flex items-center gap-2 w-full">
                  <span className={`h-2 w-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`} />
                  <span className="font-semibold text-xs truncate flex-1">{alert.title}</span>
                  <span className="text-[10px] text-stone-500 whitespace-nowrap">
                    {new Date(alert.lastSeenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-xs text-stone-500 line-clamp-2 pl-4">
                  {alert.environment} • {alert.project}
                </p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator className="bg-stone-200" />
        <DropdownMenuItem className="cursor-pointer justify-center text-xs text-stone-500 hover:text-stone-900 focus:bg-stone-50 focus:text-stone-900" asChild>
          <Link href="/dashboard/alerts">View all alerts</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
