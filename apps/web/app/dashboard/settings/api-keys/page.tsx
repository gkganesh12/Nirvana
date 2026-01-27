'use client';

import { useEffect, useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  key?: string; // Only present on creation
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  creatorEmail?: string;
  creatorName?: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const key = await res.json();
        setNewlyCreatedKey(key);
        setApiKeys([key, ...apiKeys]);
        setNewKeyName('');
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });

      if (res.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">API Keys</h1>
          <p className="text-stone-500 mt-1">Manage programmatic access to your workspace</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/90 rounded-xl animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-stone-900">API Keys</h1>
          <p className="text-stone-500 mt-1">Manage programmatic access to your workspace</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-stone-900 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Newly Created Key Alert */}
      {newlyCreatedKey?.key && (
        <div className="bg-yellow-50 border border-yellow-700/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900 mb-2">Save your API key now!</h3>
              <p className="text-sm text-stone-600 mb-4">
                For security reasons, this is the only time you&apos;ll be able to see this key.
                Copy it now and store it securely.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white/90 px-4 py-2 rounded-lg font-mono text-sm text-stone-900 overflow-x-auto">
                  {newlyCreatedKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey.key!)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-stone-900">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Create API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., CI/CD Pipeline, Mobile App"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-red-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateKey}
                  disabled={creating || !newKeyName.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-stone-900 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewKeyName('');
                  }}
                  className="px-4 py-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="bg-white/90 border border-stone-200 rounded-xl p-12 text-center">
          <Key className="w-12 h-12 text-stone-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">No API keys yet</h3>
          <p className="text-stone-500 mb-4">
            Create an API key to access Nirvana programmatically
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-stone-900 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First API Key
          </button>
        </div>
      ) : (
        <div className="bg-white/90 border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Key Prefix
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Created
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Last Used
                </th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-stone-500" />
                      <span className="text-stone-900 font-medium">{key.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-stone-500 font-mono">{key.prefix}...</code>
                  </td>
                  <td className="px-6 py-4 text-stone-500 text-sm">
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    {key.lastUsedAt ? (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {formatDate(key.lastUsedAt)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-stone-500 text-sm">
                        <Clock className="w-4 h-4" />
                        Never used
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-stone-900 mb-1">Using API Keys</h3>
            <p className="text-sm text-stone-500 mb-3">
              Include your API key in the Authorization header when making requests:
            </p>
            <code className="block bg-white/90 px-4 py-3 rounded-lg font-mono text-sm text-stone-600">
              curl -H &quot;Authorization: Bearer sk_live_...&quot; https://api.signalcraft.com/api/...
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
