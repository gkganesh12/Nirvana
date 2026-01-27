'use client';

import Link from 'next/link';
import { 
  Users, 
  Bell, 
  Building2, 
  ChevronRight,
  Key,
  ShieldCheck,
  ShieldAlert,
  Settings
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Workspace',
    description: 'General workspace configuration and preferences',
    href: '/dashboard/settings/workspace',
    icon: Building2,
  },
  {
    title: 'Team Members',
    description: 'Manage team members and their permissions',
    href: '/dashboard/settings/users',
    icon: Users,
  },
  {
    title: 'Notifications',
    description: 'Configure alert notification preferences',
    href: '/dashboard/settings/notifications',
    icon: Bell,
  },
  {
    title: 'API Keys',
    description: 'Manage programmatic access to your workspace',
    href: '/dashboard/settings/api-keys',
    icon: Key,
  },
  {
    title: 'SSO / SAML',
    description: 'Configure enterprise single sign-on',
    href: '/dashboard/settings/sso',
    icon: Settings,
  },
  {
    title: 'Permissions',
    description: 'Manage role-based access control',
    href: '/dashboard/settings/permissions',
    icon: ShieldCheck,
  },
  {
    title: 'Audit Logs',
    description: 'Security audit trail of all actions',
    href: '/dashboard/settings/audit-logs',
    icon: ShieldAlert,
  },
];

export default function SettingsPage() {

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500 mt-1">Manage your workspace and team preferences</p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group bg-white/90 border border-stone-200 rounded-xl p-6 hover:bg-stone-100/80 hover:border-red-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-50 transition-colors">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-red-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mt-4">{section.title}</h3>
              <p className="text-sm text-stone-500 mt-1">{section.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <h3 className="font-semibold text-stone-900 mb-4">Workspace Overview</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-stone-500">Plan</p>
            <p className="text-lg font-medium text-stone-900">Enterprise Ready</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Security</p>
            <p className="text-lg font-medium text-emerald-600">Enhanced</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Audit Status</p>
            <p className="text-lg font-medium text-stone-900">Active Logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
