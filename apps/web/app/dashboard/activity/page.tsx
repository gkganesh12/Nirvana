'use client';

import { useEffect, useState } from 'react';
import { 
  Activity, 
  User, 
  Settings, 
  Shield, 
  Mail, 
  AlertCircle,
  Clock,
  RefreshCw,
  Search
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/audit-logs');
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

  const getActionIcon = (action: string) => {
    if (action.includes('INVITE') || action.includes('INVITATION')) return <Mail className="w-4 h-4 text-blue-400" />;
    if (action.includes('ALERT')) return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (action.includes('ROLE') || action.includes('MEMBER')) return <Shield className="w-4 h-4 text-purple-400" />;
    if (action.includes('RULE')) return <Settings className="w-4 h-4 text-zinc-400" />;
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.resourceType.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Feed</h1>
          <p className="text-zinc-400 mt-1">Audit trail of workspace actions and system events</p>
        </div>
        <Button
          variant="ghost"
          onClick={fetchLogs}
          className="text-zinc-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter activities by action, user, or resource..."
          className="pl-10 bg-zinc-900/50 border-white/5 text-white"
        />
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-white/[0.02] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No activity found matching your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-white/[0.01] transition-colors flex items-start gap-4">
                <div className="mt-1 p-2 bg-black/40 rounded-lg border border-white/5">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {formatAction(log.action)}
                      {log.resourceType && (
                        <span className="text-zinc-500 font-normal ml-2">on {log.resourceType}</span>
                      )}
                    </p>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-800/50 rounded text-[11px] text-zinc-400">
                      <User className="w-3 h-3" />
                      {log.user?.displayName || log.user?.email || 'System'}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-[11px] text-zinc-500 truncate">
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
