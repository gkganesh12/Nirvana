'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  User,
  Settings,
  Shield,
  Mail,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: {
    email: string;
    displayName: string | null;
  };
}

export default function ActivityLogPage() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<'all' | 'anomaly'>('all');

  useEffect(() => {
    const presetParam = searchParams.get('preset');
    if (presetParam === 'anomaly') {
      setPreset('anomaly');
      fetchLogs('anomaly');
      return;
    }
    setPreset('all');
    fetchLogs('all');
  }, [searchParams]);

  async function fetchLogs(currentPreset = preset) {
    setLoading(true);
    try {
      const url =
        currentPreset === 'anomaly'
          ? '/api/workspaces/audit-logs?action=ANOMALY_DETECTED'
          : '/api/workspaces/audit-logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const updatePresetInUrl = (nextPreset: 'all' | 'anomaly') => {
    const url = new URL(window.location.href);
    if (nextPreset === 'anomaly') {
      url.searchParams.set('preset', 'anomaly');
    } else {
      url.searchParams.delete('preset');
    }
    window.history.replaceState(null, '', url.toString());
  };

  const getActionIcon = (action: string) => {
    if (action.includes('INVITE') || action.includes('INVITATION'))
      return <Mail className="w-4 h-4 text-blue-600" />;
    if (action.includes('ALERT')) return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (action.includes('ROLE') || action.includes('MEMBER'))
      return <Shield className="w-4 h-4 text-purple-600" />;
    if (action.includes('RULE')) return <Settings className="w-4 h-4 text-stone-500" />;
    return <Activity className="w-4 h-4 text-stone-500" />;
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Activity Feed</h1>
          <p className="text-stone-500 mt-1">Audit trail of workspace actions and system events</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => fetchLogs()}
          className="text-stone-500 hover:text-stone-900"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter activities by action, user, or resource..."
          className="pl-10 bg-white/90 border-stone-200 text-stone-900"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={
            preset === 'all'
              ? 'border-stone-300 bg-stone-900 text-stone-100'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }
          onClick={() => {
            setPreset('all');
            updatePresetInUrl('all');
            fetchLogs('all');
          }}
        >
          All Activity
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={
            preset === 'anomaly'
              ? 'border-amber-300 bg-amber-100 text-amber-800'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }
          onClick={() => {
            setPreset('anomaly');
            updatePresetInUrl('anomaly');
            fetchLogs('anomaly');
          }}
        >
          Anomaly Detections
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-stone-500 hover:text-stone-900"
          onClick={async () => {
            const url = new URL(window.location.href);
            if (preset === 'anomaly') {
              url.searchParams.set('preset', 'anomaly');
            } else {
              url.searchParams.delete('preset');
            }
            await navigator.clipboard.writeText(url.toString());
          }}
        >
          Copy Link
        </Button>
      </div>

      <div className="bg-white/90 border border-stone-200 rounded-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/[0.02] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No activity found matching your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-white/[0.01] transition-colors flex items-start gap-4"
              >
                <div className="mt-1 p-2 bg-white/80 rounded-lg border border-stone-200">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-900">
                      {formatAction(log.action)}
                      {log.resourceType && (
                        <span className="text-stone-500 font-normal ml-2">
                          on {log.resourceType}
                        </span>
                      )}
                    </p>
                    <span className="text-[10px] text-stone-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-stone-100/80 rounded text-[11px] text-stone-500">
                      <User className="w-3 h-3" />
                      {log.user?.displayName || log.user?.email || 'System'}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-[11px] text-stone-500 truncate">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
