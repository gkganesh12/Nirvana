'use client';

import { useEffect, useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Filter,
  Slack
} from 'lucide-react';

interface NotificationLog {
  id: string;
  target: string;
  targetRef: string;
  alertGroupId: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage: string | null;
  sentAt: string;
}

const statusConfig = {
  SENT: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20' },
  FAILED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20' },
  PENDING: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
};

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs() {
    try {
      const url = filter 
        ? `/api/notification-logs?status=${filter}` 
        : '/api/notification-logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTargetIcon = (target: string) => {
    switch (target.toUpperCase()) {
      case 'SLACK':
        return <Slack className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Notification Logs</h1>
          <p className="text-zinc-400 mt-1">Track sent and failed notifications</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notification Logs</h1>
          <p className="text-zinc-400 mt-1">Track sent and failed notifications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === ''
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          All
        </button>
        <button
          onClick={() => setFilter('SENT')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === 'SENT'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Sent
        </button>
        <button
          onClick={() => setFilter('FAILED')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === 'FAILED'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <XCircle className="w-4 h-4" />
          Failed
        </button>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No notification logs</h3>
          <p className="text-zinc-500">
            {filter 
              ? `No ${filter.toLowerCase()} notifications found` 
              : 'Notifications will appear here once alerts are triggered'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Target
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Channel/Destination
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Alert
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Time
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => {
                const config = statusConfig[log.status] || statusConfig.PENDING;
                const StatusIcon = config.icon;
                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${config.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-sm ${config.color}`}>{log.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-300">
                        {getTargetIcon(log.target)}
                        <span>{log.target}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm font-mono">
                      {log.targetRef || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`/dashboard/alerts/${log.alertGroupId}`}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        View Alert →
                      </a>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {formatDate(log.sentAt)}
                    </td>
                    <td className="px-6 py-4">
                      {log.errorMessage ? (
                        <span className="text-red-400 text-sm" title={log.errorMessage}>
                          {log.errorMessage.slice(0, 50)}
                          {log.errorMessage.length > 50 ? '...' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Sent</p>
              <p className="text-xl font-semibold text-white">
                {logs.filter(l => l.status === 'SENT').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Failed</p>
              <p className="text-xl font-semibold text-white">
                {logs.filter(l => l.status === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/20 rounded-lg">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total</p>
              <p className="text-xl font-semibold text-white">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
