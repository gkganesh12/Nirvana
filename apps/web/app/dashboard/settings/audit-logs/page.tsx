'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Search, Download, Filter, User, Tag, Calendar } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    email: string;
    displayName: string | null;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [offset, resourceType, action]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(resourceType && { resourceType }),
        ...(action && { action }),
      });
      
      const res = await fetch(`/api/audit/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/audit/export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata || Object.keys(metadata).length === 0) return '-';
    return (
      <pre className="text-[10px] bg-stone-100 p-1 rounded max-w-xs overflow-hidden text-ellipsis">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-stone-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-stone-900 flex items-center gap-2">
              📜 Audit Logs
            </CardTitle>
            <CardDescription className="text-stone-500">
              Track all security-critical actions and resource modifications.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            {exporting ? <Spinner className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-stone-50 rounded-lg border border-stone-100">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-stone-500 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Resource Type
              </Label>
              <select
                value={resourceType}
                onChange={(e) => { setResourceType(e.target.value); setOffset(0); }}
                className="w-full h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <option value="">All Resources</option>
                <option value="AlertGroup">Alert Groups</option>
                <option value="RoutingRule">Routing Rules</option>
                <option value="Integration">Integrations</option>
                <option value="User">Users</option>
                <option value="SamlConfig">SSO Config</option>
              </select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-stone-500 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Action
              </Label>
              <select
                value={action}
                onChange={(e) => { setAction(e.target.value); setOffset(0); }}
                className="w-full h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <Spinner />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left font-medium text-stone-500 py-3 px-4">Time</th>
                    <th className="text-left font-medium text-stone-500 py-3 px-4">User</th>
                    <th className="text-left font-medium text-stone-500 py-3 px-4">Action</th>
                    <th className="text-left font-medium text-stone-500 py-3 px-4">Resource</th>
                    <th className="text-left font-medium text-stone-500 py-3 px-4">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-900">{log.user.displayName || 'Unknown'}</span>
                          <span className="text-[10px] text-stone-400">{log.user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-stone-700">{log.resourceType}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{log.resourceId || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {formatMetadata(log.metadata)}
                      </td>
                    </tr>
                  ))}
                  {!loading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400 italic">
                        No audit logs found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-stone-100">
            <p className="text-xs text-stone-500">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} logs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="border-stone-200 text-stone-600"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="border-stone-200 text-stone-600"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
