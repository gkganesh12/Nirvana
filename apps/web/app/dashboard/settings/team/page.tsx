'use client';

import { useEffect, useState } from 'react';
import { Users, Shield, Trash2, UserPlus, RefreshCw, Mail, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TeamMember {
  id: string;
  email: string;
  displayName: string | null;
  phoneNumber?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [phoneEdits, setPhoneEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/workspaces/members'),
        fetch('/api/invitations'),
      ]);

      if (membersRes.ok) {
        const memberData = await membersRes.json();
        setMembers(memberData);
        setPhoneEdits((prev) => {
          const next = { ...prev };
          memberData.forEach((member: TeamMember) => {
            if (next[member.id] === undefined) {
              next[member.id] = member.phoneNumber || '';
            }
          });
          return next;
        });
      }
      if (invitesRes.ok) {
        const inviteData = await invitesRes.json();
        setInvitations(inviteData.filter((i: Invitation) => i.status === 'PENDING'));
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        alert(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert('An error occurred while inviting');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/workspaces/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        alert('Member role updated');
        await fetchData();
      } else {
        alert('Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  }

  async function handlePhoneSave(userId: string) {
    try {
      const res = await fetch(`/api/workspaces/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneEdits[userId] || null }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to update phone number');
      }
    } catch (error) {
      console.error('Failed to update phone number:', error);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const res = await fetch(`/api/workspaces/members/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Member removed from workspace');
        setMembers(members.filter((m) => m.id !== userId));
      } else {
        alert('Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }

  async function handleRevokeInvitation(inviteId: string) {
    try {
      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Invitation revoked');
        setInvitations(invitations.filter((i) => i.id !== inviteId));
      } else {
        alert('Failed to revoke invitation');
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEMBER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'VIEWER':
        return 'bg-stone-100 text-stone-600 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-stone-100 rounded"></div>
          <div className="h-4 w-64 bg-stone-100 rounded"></div>
          <div className="h-32 bg-white/90 rounded-xl"></div>
          <div className="h-64 bg-white/90 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Team Management</h1>
          <p className="text-stone-500 mt-1">Manage workspace members and invitations</p>
        </div>
        <Button variant="ghost" onClick={fetchData} className="text-stone-500 hover:text-stone-900">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Invite Section */}
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-red-600" />
          Invite Team Member
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="bg-white/80 border-stone-200"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-stone-200 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="bg-red-600 hover:bg-red-700 text-stone-900 min-w-[120px]"
          >
            {inviting ? 'Inviting...' : 'Send Invite'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Active Members */}
        <div className="bg-white/90 border border-stone-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 bg-white/[0.02]">
            <h2 className="font-semibold text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Members ({members.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-stone-200">
                  <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-xs font-bold text-stone-900 uppercase">
                          {member.displayName?.charAt(0) || member.email.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">
                            {member.displayName || member.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-stone-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={phoneEdits[member.id] ?? ''}
                          onChange={(e) =>
                            setPhoneEdits((prev) => ({ ...prev, [member.id]: e.target.value }))
                          }
                          placeholder="+1 555 123 4567"
                          className="h-8 w-40 bg-white/80 border-stone-200 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePhoneSave(member.id)}
                          className="text-stone-500 hover:text-stone-900"
                        >
                          Save
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={member.role === 'OWNER'}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border bg-transparent focus:outline-none ${getRoleBadgeColor(member.role)}`}
                      >
                        <option value="OWNER" disabled>
                          OWNER
                        </option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-8 w-8 p-0 text-stone-500 hover:text-red-600 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white/90 border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-white/[0.02]">
              <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-stone-500" />
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-stone-200">
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-stone-500" />
                          <span className="text-sm text-stone-600">{invite.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(invite.role)}`}
                        >
                          {invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-500">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invite.id)}
                          className="h-8 w-8 p-0 text-stone-500 hover:text-red-600 hover:bg-red-400/10"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Role Help */}
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <h3 className="font-medium text-stone-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Role Permissions
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-white/70 rounded-lg border border-stone-200">
            <p className="text-xs font-bold text-purple-600 uppercase mb-1">Owner</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Absolute control over the workspace, billing, and all features. Only one per
              workspace.
            </p>
          </div>
          <div className="p-4 bg-white/70 rounded-lg border border-stone-200">
            <p className="text-xs font-bold text-red-600 uppercase mb-1">Admin</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Full access to settings, team management, and configurations.
            </p>
          </div>
          <div className="p-4 bg-white/70 rounded-lg border border-stone-200">
            <p className="text-xs font-bold text-blue-600 uppercase mb-1">Member</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Can manage alerts, routing rules, and view integrations.
            </p>
          </div>
          <div className="p-4 bg-white/70 rounded-lg border border-stone-200">
            <p className="text-xs font-bold text-stone-500 uppercase mb-1">Viewer</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Read-only access to dashboards and alert details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
