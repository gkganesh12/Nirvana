'use client';

import { useEffect, useState, useCallback } from 'react';
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
  SENT: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  FAILED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
};

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
          <h1 className="text-3xl font-bold text-stone-900">Notification Logs</h1>
          <p className="text-stone-500 mt-1">Track sent and failed notifications</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/90 rounded-xl animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-stone-900">Notification Logs</h1>
          <p className="text-stone-500 mt-1">Track sent and failed notifications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
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
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
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
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
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
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          }`}
        >
          <XCircle className="w-4 h-4" />
          Failed
        </button>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="bg-white/90 border border-stone-200 rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-stone-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">No notification logs</h3>
          <p className="text-stone-500">
            {filter 
              ? `No ${filter.toLowerCase()} notifications found` 
              : 'Notifications will appear here once alerts are triggered'}
          </p>
        </div>
      ) : (
        <div className="bg-white/90 border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Target
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Channel/Destination
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Alert
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Time
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
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
                      <div className="flex items-center gap-2 text-stone-600">
                        {getTargetIcon(log.target)}
                        <span>{log.target}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-500 text-sm font-mono">
                      {log.targetRef || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`/dashboard/alerts/${log.alertGroupId}`}
                        className="text-red-600 hover:text-red-500 text-sm"
                      >
                        View Alert →
                      </a>
                    </td>
                    <td className="px-6 py-4 text-stone-500 text-sm">
                      {formatDate(log.sentAt)}
                    </td>
                    <td className="px-6 py-4">
                      {log.errorMessage ? (
                        <span className="text-red-600 text-sm" title={log.errorMessage}>
                          {log.errorMessage.slice(0, 50)}
                          {log.errorMessage.length > 50 ? '...' : ''}
                        </span>
                      ) : (
                        <span className="text-stone-500">-</span>
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
        <div className="bg-white/90 border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Sent</p>
              <p className="text-xl font-semibold text-stone-900">
                {logs.filter(l => l.status === 'SENT').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/90 border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Failed</p>
              <p className="text-xl font-semibold text-stone-900">
                {logs.filter(l => l.status === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/90 border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Total</p>
              <p className="text-xl font-semibold text-stone-900">{logs.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
