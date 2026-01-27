'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type PermissionAction = 'READ' | 'WRITE' | 'DELETE' | 'MANAGE';
type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

interface PermissionMatrix {
  [resource: string]: PermissionAction[];
}

interface RolePermissions {
  [role: string]: PermissionMatrix;
}

const ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER'];
const ACTIONS: PermissionAction[] = ['READ', 'WRITE', 'DELETE', 'MANAGE'];

const RESOURCE_LABELS: Record<string, string> = {
  alerts: '🚨 Alerts',
  routing: '🔀 Routing Rules',
  integrations: '🔌 Integrations',
  settings: '⚙️ Settings',
  users: '👥 Users',
  'api-keys': '🔑 API Keys',
  'audit-logs': '📜 Audit Logs',
  sso: '🔐 SSO / SAML',
};

export default function PermissionsPage() {
  const [defaults, setDefaults] = useState<RolePermissions | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/permissions/defaults');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setDefaults(data);
      setPermissions(JSON.parse(JSON.stringify(data))); // Deep clone
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (resource: string, action: PermissionAction) => {
    if (!permissions || selectedRole === 'OWNER') return;
    
    const rolePerms = permissions[selectedRole];
    const resourcePerms = rolePerms[resource] || [];
    
    if (resourcePerms.includes(action)) {
      rolePerms[resource] = resourcePerms.filter((a) => a !== action);
    } else {
      rolePerms[resource] = [...resourcePerms, action];
    }
    
    setPermissions({ ...permissions });
  };

  const hasAction = (role: WorkspaceRole, resource: string, action: PermissionAction): boolean => {
    if (!permissions) return false;
    return permissions[role]?.[resource]?.includes(action) ?? false;
  };

  const handleSave = async () => {
    if (!permissions || selectedRole === 'OWNER') return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/permissions/role/${selectedRole}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissions[selectedRole] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save permissions');
      }

      setSuccess(`Permissions updated for ${selectedRole} role`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (defaults) {
      setPermissions(JSON.parse(JSON.stringify(defaults)));
      setSuccess(null);
      setError(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-900">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  const resources = Object.keys(RESOURCE_LABELS);

  return (
    <div className="space-y-6">
      <Card className="bg-white border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-900 flex items-center gap-2">
            🛡️ Role Permissions
          </CardTitle>
          <CardDescription className="text-stone-500">
            Configure granular permissions for each role. OWNER permissions cannot be modified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-lg text-sm">
              ✓ {success}
            </div>
          )}

          {/* Role Tabs */}
          <div className="flex gap-2 border-b border-stone-200 pb-4">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedRole === role
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {selectedRole === 'OWNER' && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-600 text-sm">
              ⚠️ Owner permissions are locked and cannot be modified. Owners have full access to all resources.
            </div>
          )}

          {/* Permission Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-stone-500 font-medium">Resource</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="text-center py-3 px-4 text-stone-500 font-medium">
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource} className="border-b border-stone-200 hover:bg-white/80 transition-colors">
                    <td className="py-3 px-4 text-stone-900">{RESOURCE_LABELS[resource]}</td>
                    {ACTIONS.map((action) => {
                      const hasPermission = hasAction(selectedRole, resource, action);
                      const disabled = selectedRole === 'OWNER';
                      
                      return (
                        <td key={action} className="text-center py-3 px-4">
                          <button
                            onClick={() => toggleAction(resource, action)}
                            disabled={disabled}
                            className={`w-8 h-8 rounded-md border transition-all ${
                              hasPermission
                                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-600'
                                : 'bg-white border-stone-200 text-stone-500'
                            } ${
                              disabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'hover:border-stone-300 cursor-pointer'
                            }`}
                          >
                            {hasPermission ? '✓' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          {selectedRole !== 'OWNER' && (
            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-stone-200 text-stone-500 hover:bg-white hover:text-stone-900"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-stone-900 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-white border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-900 text-sm">Permission Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-600">READ</span>
              <span className="text-stone-500">View resources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-600">WRITE</span>
              <span className="text-stone-500">Create & update</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-600">DELETE</span>
              <span className="text-stone-500">Remove resources</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-600">MANAGE</span>
              <span className="text-stone-500">Full control</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
