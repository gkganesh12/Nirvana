'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/alerts/status-badge';
import { SeverityBadge } from '@/components/alerts/severity-badge';
import { AiSuggestionCard } from '@/components/alerts/ai-suggestion-card';
import { CorrelatedAlerts } from '@/components/alerts/correlated-alerts';
import { PostmortemModal } from '@/components/alerts/postmortem-modal';
import { BreadcrumbTimeline } from '@/components/alerts/breadcrumb-timeline';
import { SessionReplayPlayer } from '@/components/alerts/session-replay-player';
import { CollaborationFeed } from '@/components/incidents/collaboration-feed';
import { TimelineFeed } from '@/components/incidents/timeline-feed';
import { PostMortemEditor } from '@/components/incidents/post-mortem-editor';
import { Pencil, Save, X, Siren, MessageSquare, History, FileText, LayoutDashboard } from 'lucide-react';

interface AlertDetail {
  id: string;
  title: string;
  severity: string;
  status: string;
  environment: string;
  project: string;
  workspaceId: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  runbookUrl: string | null;
  runbookMarkdown?: string | null;
  resolutionNotes: string | null;
  lastResolvedBy: string | null;
  avgResolutionMins: number | null;
  resolvedAt: string | null;
  jiraIssueKey?: string | null;
  jiraIssueUrl?: string | null;
  release?: {
    id: string;
    version: string;
    environment: string;
    project: string;
    deployedAt: string;
  } | null;
  conferenceUrl?: string | null;
  warRoomChannelId?: string | null;
  warRoomChannelName?: string | null;
  userCount: number | null;
  velocityPerHour: number | null;
  assignee?: { id: string; displayName: string; email: string } | null;
  alertEvents: Array<{
    id: string;
    title: string;
    message: string;
    occurredAt: string;
  }>;
  notifications: Array<{
    id: string;
    target: string;
    targetRef: string;
    status: string;
    sentAt: string;
    errorMessage: string | null;
  }>;
  isAnomalous?: boolean;
}

interface IncidentRoleAssignment {
  id: string;
  role: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
}

interface IncidentTimelineEntry {
  id: string;
  type: string;
  title: string;
  message: string | null;
  source: string | null;
  occurredAt: string;
}

interface StatusPageSummary {
  id: string;
  title: string;
}

interface AnomalyHistory {
  windowHours: number;
  mean: number;
  stdDev: number;
  currentCount: number;
  zScore: number;
  buckets: number[];
  seasonalMean?: number | null;
  seasonalStdDev?: number | null;
  seasonalHour?: number | null;
}

interface ChangeEventItem {
  id: string;
  type: string;
  source: string;
  title: string | null;
  project: string | null;
  environment: string | null;
  actor: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
}

interface SilenceIntelligence {
  available: boolean;
  message?: string;
  totalSnoozes?: number;
  topDay?: { index: number; count: number; name: string };
  topHour?: { hour: number; count: number };
  confidence?: number;
  suggestedWindow?: {
    dayOfWeek: number;
    dayName: string;
    startHour: number;
    endHour: number;
    durationMinutes: number;
  };
}

interface ChatOpsResult {
  id: string;
  title: string;
  severity: string;
  status: string;
  project: string;
  environment: string;
  lastSeenAt: string;
}

interface User {
  id: string;
  displayName: string | null;
  email: string;
}

interface PagingPolicySummary {
  id: string;
  name: string;
  rotationId: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AlertDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const { user } = useUser();
  const id = params.id as string;

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pagingPolicies, setPagingPolicies] = useState<PagingPolicySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    assigneeUserId: string;
    runbookUrl: string;
    conferenceUrl: string;
  }>({
    assigneeUserId: '',
    runbookUrl: '',
    conferenceUrl: '',
  });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [pagingDialogOpen, setPagingDialogOpen] = useState(false);
  const [pagingPolicyId, setPagingPolicyId] = useState('');
  const [pagingError, setPagingError] = useState<string | null>(null);
  const [pagingLoading, setPagingLoading] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraMessage, setJiraMessage] = useState<string | null>(null);
  const [jiraTicketUrl, setJiraTicketUrl] = useState<string | null>(null);
  const [warRoomLoading, setWarRoomLoading] = useState(false);
  const [warRoomMessage, setWarRoomMessage] = useState<string | null>(null);
  const [incidentRoles, setIncidentRoles] = useState<IncidentRoleAssignment[]>([]);
  const [roleSaving, setRoleSaving] = useState<Record<string, boolean>>({});
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [timelineEntries, setTimelineEntries] = useState<IncidentTimelineEntry[]>([]);
  const [statusPages, setStatusPages] = useState<StatusPageSummary[]>([]);
  const [statusPageId, setStatusPageId] = useState('');
  const [statusUpdate, setStatusUpdate] = useState({
    title: '',
    status: 'INVESTIGATING',
    impact: 'MINOR',
    message: '',
  });
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyHistory | null>(null);
  const [changeEvents, setChangeEvents] = useState<ChangeEventItem[]>([]);
  const [silenceIntel, setSilenceIntel] = useState<SilenceIntelligence | null>(null);
  const [runbookDraft, setRunbookDraft] = useState<string | null>(null);
  const [runbookLoading, setRunbookLoading] = useState(false);
  const [runbookMessage, setRunbookMessage] = useState<string | null>(null);
  const [runbookPreview, setRunbookPreview] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResults, setChatResults] = useState<ChatOpsResult[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'collaboration' | 'postmortem'>('overview');

  const fetchAlert = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch alert');
      const data = await res.json();
      setAlert(data);
      setJiraTicketUrl(data.jiraIssueUrl ?? null);
      if (!isEditing) {
        setEditForm({
          assigneeUserId: data.assignee?.id || '',
          runbookUrl: data.runbookUrl || '',
          conferenceUrl: data.conferenceUrl || '',
        });
      }
      setRunbookDraft(data.runbookMarkdown || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  }, []);

  const fetchPagingPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/paging/policies');
      if (res.ok) {
        const data = await res.json();
        setPagingPolicies(data);
        if (!pagingPolicyId && data.length) {
          setPagingPolicyId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch paging policies', err);
    }
  }, [pagingPolicyId]);

  const fetchIncidentRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/roles`);
      if (res.ok) {
        setIncidentRoles(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch incident roles', err);
    }
  }, [id]);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/timeline`);
      if (res.ok) {
        setTimelineEntries(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch timeline', err);
    }
  }, [id]);

  const fetchStatusPages = useCallback(async () => {
    try {
      const res = await fetch('/api/status-pages');
      if (res.ok) {
        const data = await res.json();
        setStatusPages(data);
        if (!statusPageId && data.length) {
          setStatusPageId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch status pages', err);
    }
  }, [statusPageId]);

  const fetchAnomalyHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/anomaly-history`);
      if (res.ok) {
        setAnomalyHistory(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch anomaly history', err);
    }
  }, [id]);

  const fetchChangeEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/change-events`);
      if (res.ok) {
        setChangeEvents(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch change events', err);
    }
  }, [id]);

  const fetchSilenceIntel = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/silence-intel`);
      if (res.ok) {
        setSilenceIntel(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch silence intelligence', err);
    }
  }, [id]);

  useEffect(() => {
    fetchAlert();
    fetchUsers();
    fetchPagingPolicies();
    fetchIncidentRoles();
    fetchTimeline();
    fetchStatusPages();
    fetchAnomalyHistory();
    fetchChangeEvents();
    fetchSilenceIntel();
    const interval = setInterval(fetchAlert, 15000);
    return () => clearInterval(interval);
  }, [
    fetchAlert,
    fetchUsers,
    fetchPagingPolicies,
    fetchIncidentRoles,
    fetchTimeline,
    fetchStatusPages,
    fetchAnomalyHistory,
    fetchChangeEvents,
    fetchSilenceIntel,
  ]);

  const incidentRoleOptions = [
    { key: 'COMMANDER', label: 'Incident Commander' },
    { key: 'SCRIBE', label: 'Scribe' },
    { key: 'LIAISON', label: 'Customer Liaison' },
    { key: 'TECH_LEAD', label: 'Tech Lead' },
  ];

  const handleAction = async (action: 'acknowledge' | 'snooze') => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/alert-groups/${id}/${action}`, { method: 'POST' });
      if (res.ok) fetchAlert();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setActionLoading(true);
      const resolverName =
        user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`
          : user?.emailAddresses?.[0]?.emailAddress || 'Unknown';

      const res = await fetch(`/api/alert-groups/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionNotes: resolutionNotes || undefined,
          resolvedBy: resolverName,
        }),
      });
      if (res.ok) {
        setShowResolveModal(false);
        setResolutionNotes('');
        fetchAlert();
      }
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/alert-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigneeUserId: editForm.assigneeUserId || null,
          runbookUrl: editForm.runbookUrl || null,
          runbookMarkdown: runbookDraft || null,
          conferenceUrl: editForm.conferenceUrl || null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchAlert();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerPaging = async () => {
    if (!pagingPolicyId) {
      setPagingError('Select a paging policy');
      return;
    }

    try {
      setPagingLoading(true);
      setPagingError(null);
      const res = await fetch('/api/paging/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: pagingPolicyId, alertGroupId: id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to trigger paging');
      }

      setPagingDialogOpen(false);
    } catch (err) {
      setPagingError(err instanceof Error ? err.message : 'Failed to trigger paging');
    } finally {
      setPagingLoading(false);
    }
  };

  const handleCreateJiraTicket = async () => {
    try {
      setJiraLoading(true);
      setJiraMessage(null);
      const res = await fetch(`/api/alert-groups/${id}/jira-ticket`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Jira ticket');
      }
      setJiraTicketUrl(data.issueUrl || null);
      setJiraMessage(`Created Jira ticket ${data.issueKey || ''}`.trim());
      fetchAlert();
    } catch (err) {
      setJiraMessage(err instanceof Error ? err.message : 'Failed to create Jira ticket');
    } finally {
      setJiraLoading(false);
    }
  };

  const handleCreateWarRoom = async () => {
    try {
      setWarRoomLoading(true);
      setWarRoomMessage(null);
      const res = await fetch(`/api/alert-groups/${id}/war-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conferenceUrl: editForm.conferenceUrl || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create war room');
      }
      setWarRoomMessage('War room created');
      fetchAlert();
    } catch (err) {
      setWarRoomMessage(err instanceof Error ? err.message : 'Failed to create war room');
    } finally {
      setWarRoomLoading(false);
    }
  };

  const handleRoleChange = async (role: string, userId: string) => {
    setRoleMessage(null);
    setRoleSaving((prev) => ({ ...prev, [role]: true }));
    try {
      if (!userId) {
        const res = await fetch(`/api/alert-groups/${id}/roles/${role}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to remove role');
        }
      } else {
        const res = await fetch(`/api/alert-groups/${id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, userId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to assign role');
        }
      }
      await fetchIncidentRoles();
      setRoleMessage('Role updated');
    } catch (err) {
      setRoleMessage(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setRoleSaving((prev) => ({ ...prev, [role]: false }));
    }
  };

  const handlePublishStatusUpdate = async () => {
    if (!statusPageId) {
      setStatusUpdateMessage('Select a status page first');
      return;
    }
    if (!alert) {
      setStatusUpdateMessage('Alert not loaded');
      return;
    }
    try {
      setStatusUpdateMessage(null);
      const res = await fetch(`/api/status-pages/${statusPageId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...statusUpdate,
          alertGroupId: id,
          title: statusUpdate.title || alert.title,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish status update');
      }
      setStatusUpdateMessage('Status update published');
      setStatusUpdate({ title: '', status: 'INVESTIGATING', impact: 'MINOR', message: '' });
    } catch (err) {
      setStatusUpdateMessage(
        err instanceof Error ? err.message : 'Failed to publish status update',
      );
    }
  };

  const handleGenerateRunbook = async (save: boolean) => {
    try {
      setRunbookLoading(true);
      setRunbookMessage(null);
      const res = await fetch(`/api/alert-groups/${id}/runbook-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate runbook');
      }
      if (data?.draft) {
        setRunbookDraft(data.draft);
      }
      setRunbookMessage(save ? 'Runbook saved' : 'Draft generated');
      if (save) {
        fetchAlert();
      }
    } catch (err) {
      setRunbookMessage(err instanceof Error ? err.message : 'Failed to generate runbook');
    } finally {
      setRunbookLoading(false);
    }
  };

  const handleChatQuery = async () => {
    const query = chatQuery.trim();
    if (!query) {
      setChatMessage('Enter a question to search alerts.');
      return;
    }

    try {
      setChatLoading(true);
      setChatMessage(null);
      const res = await fetch('/api/chatops/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run ChatOps query');
      }
      setChatResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setChatMessage('No matching alerts found.');
      }
    } catch (err) {
      setChatMessage(err instanceof Error ? err.message : 'Failed to run ChatOps query');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500">{error || 'Alert not found'}</p>
          <Link href="/dashboard/alerts">
            <Button className="mt-4 bg-red-600 hover:bg-red-700">Back to Alerts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const maxAnomalyBucket = anomalyHistory ? Math.max(...anomalyHistory.buckets, 1) : 1;

  return (
    <div className="space-y-6">
      {/* Sub-Header with Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-1">
        <div className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'timeline', label: 'Timeline', icon: History },
            { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
            { id: 'postmortem', label: 'Post-Mortem', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-stone-500">
        <Link href="/dashboard" className="hover:text-red-600 transition-colors">
          Dashboard
        </Link>
        <span>›</span>
        <Link href="/dashboard/alerts" className="hover:text-red-600 transition-colors">
          Alerts
        </Link>
        <span>›</span>
        <span className="text-stone-900 truncate max-w-xs">{alert.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900">{alert.title}</h1>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
              {alert.release && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  Suspect deploy {alert.release.version} · {formatTimeAgo(alert.release.deployedAt)}
                </span>
              )}
            </div>
            <p className="text-stone-500">
              {alert.project} • {alert.environment}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <SessionReplayPlayer alertGroupId={alert.id} />
            {alert.status === 'RESOLVED' && (
              <Button
                variant="outline"
                onClick={() => setActiveTab('postmortem')}
                className="border-stone-200 text-stone-600 hover:bg-stone-100"
              >
                <FileText className="w-4 h-4 mr-2" />
                Incident Report
              </Button>
            )}
            {alert.jiraIssueUrl ? (
              <Button
                asChild
                variant="outline"
                className="border-stone-200 text-stone-700 hover:bg-stone-100"
              >
                <a href={alert.jiraIssueUrl} target="_blank" rel="noopener noreferrer">
                  View Jira Ticket
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCreateJiraTicket}
                disabled={jiraLoading}
                className="border-stone-200 text-stone-700 hover:bg-stone-100"
              >
                {jiraLoading ? 'Creating Jira...' : 'Create Jira Ticket'}
              </Button>
            )}
            {alert.warRoomChannelId ? (
              <Button
                asChild
                variant="outline"
                className="border-stone-200 text-stone-700 hover:bg-stone-100"
              >
                <a
                  href={`https://slack.com/app_redirect?channel=${alert.warRoomChannelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open War Room
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCreateWarRoom}
                disabled={warRoomLoading}
                className="border-stone-200 text-stone-700 hover:bg-stone-100"
              >
                {warRoomLoading ? 'Creating War Room...' : 'Create War Room'}
              </Button>
            )}
            {(alert.status === 'OPEN' || alert.status === 'ACK') && (
              <Button
                variant="outline"
                onClick={() => {
                  setPagingError(null);
                  setPagingDialogOpen(true);
                }}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Siren className="w-4 h-4 mr-2" />
                Page Now
              </Button>
            )}
            {alert.status === 'OPEN' && (
              <Button
                onClick={() => handleAction('acknowledge')}
                disabled={actionLoading}
                className="bg-stone-100 hover:bg-stone-200 text-stone-900 border-0"
              >
                Acknowledge
              </Button>
            )}
            {(alert.status === 'OPEN' || alert.status === 'ACK') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction('snooze')}
                  disabled={actionLoading}
                  className="border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                  Snooze
                </Button>
                <Button
                  onClick={() => setShowResolveModal(true)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-stone-900"
                >
                  Resolve
                </Button>
              </>
            )}
          </div>
        </div>
        {jiraMessage && (
          <div className="mt-3 text-sm text-stone-600">
            {jiraMessage}
            {jiraTicketUrl && (
              <a
                href={jiraTicketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-red-600 hover:underline"
              >
                View ticket
              </a>
            )}
          </div>
        )}
        {warRoomMessage && <div className="mt-3 text-sm text-stone-600">{warRoomMessage}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white/90 border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">Command Center</h3>
            {roleMessage && <span className="text-sm text-stone-500">{roleMessage}</span>}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {incidentRoleOptions.map((role) => {
              const assignment = incidentRoles.find((item) => item.role === role.key);
              return (
                <div key={role.key} className="rounded-xl border border-stone-200 bg-white/80 p-4">
                  <div className="text-sm font-medium text-stone-700">{role.label}</div>
                  <div className="mt-2">
                    <select
                      value={assignment?.user.id ?? ''}
                      onChange={(e) => handleRoleChange(role.key, e.target.value)}
                      disabled={roleSaving[role.key]}
                      className="flex h-9 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <h4 className="text-sm font-semibold text-stone-700">Status Updates</h4>
            <div className="mt-3 grid gap-3">
              <select
                value={statusPageId}
                onChange={(e) => setStatusPageId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-900"
              >
                {statusPages.length === 0 ? (
                  <option value="">No status pages configured</option>
                ) : (
                  statusPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))
                )}
              </select>
              <Input
                placeholder="Incident title (optional)"
                value={statusUpdate.title}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, title: e.target.value })}
                className="bg-white/70"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-900"
                >
                  {['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={statusUpdate.impact}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, impact: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-1 text-sm text-stone-900"
                >
                  {['NONE', 'MINOR', 'MAJOR', 'CRITICAL'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Update message"
                value={statusUpdate.message}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, message: e.target.value })}
                className="bg-white/70"
              />
              <Button
                onClick={handlePublishStatusUpdate}
                className="bg-stone-900 text-white hover:bg-stone-800"
              >
                Publish Status Update
              </Button>
              {statusUpdateMessage && (
                <div className="text-sm text-stone-600">{statusUpdateMessage}</div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <h4 className="text-sm font-semibold text-stone-700">ChatOps Query</h4>
            <div className="mt-3 grid gap-3">
              <Input
                placeholder="e.g. high latency alerts last 24h payments service"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                className="bg-white/70"
              />
              <Button
                onClick={handleChatQuery}
                className="bg-stone-900 text-white hover:bg-stone-800"
                disabled={chatLoading}
              >
                {chatLoading ? 'Searching...' : 'Run Query'}
              </Button>
              {chatMessage && <div className="text-sm text-stone-600">{chatMessage}</div>}
              {chatResults.length > 0 && (
                <div className="space-y-2">
                  {chatResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/dashboard/alerts/${result.id}`}
                      className="block rounded-lg border border-stone-200 bg-white/70 p-3 text-sm text-stone-700 hover:border-stone-300"
                    >
                      <div className="font-medium text-stone-900">{result.title}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {result.project} • {result.environment} • {result.severity} •{' '}
                        {result.status}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900">Live Timeline</h3>
          {timelineEntries.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No timeline entries yet.</p>
          ) : (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {timelineEntries.map((entry) => (
                <div key={entry.id} className="border-l-2 border-red-200 pl-4">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>{formatRelativeTime(entry.occurredAt)}</span>
                    {entry.source && <span>{entry.source}</span>}
                  </div>
                  <div className="text-sm font-medium text-stone-800 mt-1">{entry.title}</div>
                  {entry.message && (
                    <div className="text-xs text-stone-500 mt-1 break-words">{entry.message}</div>
                  )}
                  {entry.type === 'DEPLOYMENT_CORRELATED' && alert.release?.id && (
                    <Link
                      href={`/dashboard/releases/${alert.release.id}`}
                      className="mt-1 inline-flex text-xs text-amber-700 hover:underline"
                    >
                      View release details
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900">Anomaly Velocity</h3>
          {!anomalyHistory ? (
            <p className="mt-2 text-sm text-stone-500">No data yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs text-stone-500">
                <div>
                  <div className="text-stone-400">
                    {anomalyHistory.seasonalMean != null ? 'Seasonal mean / hr' : 'Mean / hr'}
                  </div>
                  <div className="text-stone-800 font-semibold">
                    {anomalyHistory.mean.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-stone-400">Z-Score</div>
                  <div className="text-stone-800 font-semibold">
                    {anomalyHistory.zScore.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-1 h-24">
                {anomalyHistory.buckets.map((count, index) => {
                  const height = Math.max((count / maxAnomalyBucket) * 100, 4);
                  return (
                    <div
                      key={index}
                      className="flex-1 rounded-sm bg-amber-200/70"
                      style={{ height: `${height}%` }}
                      title={`${count} events`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-stone-500">
                Last {anomalyHistory.windowHours} hours • Current hour:{' '}
                {anomalyHistory.currentCount} events
              </div>
            </div>
          )}
        </div>

        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900">Change Events</h3>
          {changeEvents.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No recent change events.</p>
          ) : (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {changeEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-stone-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>{formatRelativeTime(event.timestamp)}</span>
                    <span>{event.source}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-stone-800">
                    {event.title || event.type}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {[event.type, event.project, event.environment].filter(Boolean).join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900">Silence Intelligence</h3>
          {!silenceIntel ? (
            <p className="mt-2 text-sm text-stone-500">Loading insights...</p>
          ) : silenceIntel.available ? (
            <div className="mt-3 space-y-2 text-sm text-stone-700">
              <div>
                You often snooze this alert on {silenceIntel.suggestedWindow?.dayName} around{' '}
                {silenceIntel.suggestedWindow?.startHour}:00.
              </div>
              <div className="text-xs text-stone-500">
                Suggested auto-snooze: {silenceIntel.suggestedWindow?.durationMinutes} minutes •
                Confidence {Math.round((silenceIntel.confidence ?? 0) * 100)}%
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-500">{silenceIntel.message}</p>
          )}
        </div>

        <div className="lg:col-span-3 bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900">Incident Tasks</h3>
          <p className="mt-2 text-sm text-stone-500">No tasks created yet.</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-900">Details</h3>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={actionLoading}
                  className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>

          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-stone-500">First Seen</dt>
              <dd className="font-medium text-stone-900">{formatDate(alert.firstSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Last Seen</dt>
              <dd className="font-medium text-stone-900">{formatDate(alert.lastSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Event Count</dt>
              <dd className="font-mono font-medium text-stone-900">{alert.count}</dd>
            </div>

            <div className="flex justify-between items-center h-9">
              <dt className="text-stone-500">Assignee</dt>
              <dd className="font-medium min-w-[200px] text-right text-stone-900">
                {isEditing ? (
                  <select
                    className="w-full px-2 py-1 border border-stone-200 rounded text-sm bg-white/70 text-stone-900 focus:ring-red-500/50 focus:border-red-500/50"
                    value={editForm.assigneeUserId}
                    onChange={(e) => setEditForm({ ...editForm, assigneeUserId: e.target.value })}
                  >
                    <option value="" className="bg-white">
                      Unassigned
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-white">
                        {u.displayName || u.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  alert.assignee?.displayName || <span className="text-stone-500">Unassigned</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-stone-500">Runbook</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {isEditing ? (
                  <Input
                    className="h-8 text-sm bg-white/70 border-stone-200 text-stone-900"
                    placeholder="https://..."
                    value={editForm.runbookUrl}
                    onChange={(e) => setEditForm({ ...editForm, runbookUrl: e.target.value })}
                  />
                ) : alert.runbookUrl ? (
                  <a
                    href={alert.runbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-500 hover:underline"
                  >
                    View Runbook
                  </a>
                ) : (
                  <span className="text-stone-500 text-sm">None</span>
                )}
              </dd>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white/70 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-stone-700">Runbook Draft</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRunbookPreview((prev) => !prev)}
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  >
                    {runbookPreview ? 'Hide Preview' : 'Preview'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateRunbook(false)}
                    disabled={runbookLoading}
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  >
                    {runbookLoading ? 'Generating...' : 'Generate Draft'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateRunbook(true)}
                    disabled={runbookLoading}
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (runbookDraft) {
                        setEditForm((prev) => ({
                          ...prev,
                          runbookUrl: `data:text/markdown,${encodeURIComponent(runbookDraft)}`,
                        }));
                        setRunbookMessage('Runbook URL set to draft');
                      }
                    }}
                    disabled={!runbookDraft}
                    className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  >
                    Use Draft URL
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                {runbookPreview ? (
                  <pre className="w-full min-h-[140px] rounded-md border border-stone-200 bg-white/80 p-2 text-xs text-stone-700 whitespace-pre-wrap">
                    {runbookDraft || 'No draft generated yet.'}
                  </pre>
                ) : (
                  <textarea
                    className="w-full min-h-[140px] rounded-md border border-stone-200 bg-white/80 p-2 text-xs text-stone-700"
                    value={runbookDraft ?? ''}
                    onChange={(e) => setRunbookDraft(e.target.value)}
                    placeholder="AI runbook draft will appear here..."
                  />
                )}
              </div>
              {runbookMessage && (
                <div className="mt-2 text-xs text-stone-500">{runbookMessage}</div>
              )}
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-stone-500">Conference</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {isEditing ? (
                  <Input
                    className="h-8 text-sm bg-white/70 border-stone-200 text-stone-900"
                    placeholder="https://meet..."
                    value={editForm.conferenceUrl}
                    onChange={(e) => setEditForm({ ...editForm, conferenceUrl: e.target.value })}
                  />
                ) : alert.conferenceUrl ? (
                  <a
                    href={alert.conferenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-500 hover:underline"
                  >
                    Join Bridge
                  </a>
                ) : (
                  <span className="text-stone-500 text-sm">None</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-stone-500">War Room</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {alert.warRoomChannelId ? (
                  <a
                    href={`https://slack.com/app_redirect?channel=${alert.warRoomChannelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-500 hover:underline"
                  >
                    {alert.warRoomChannelName ?? 'Open Channel'}
                  </a>
                ) : (
                  <span className="text-stone-500 text-sm">Not created</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-stone-500">Jira Ticket</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {alert.jiraIssueUrl ? (
                  <a
                    href={alert.jiraIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-500 hover:underline"
                  >
                    {alert.jiraIssueKey ?? 'View Ticket'}
                  </a>
                ) : (
                  <span className="text-stone-500 text-sm">None</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-stone-500">Suspect Deployment</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {alert.release ? (
                  <span className="text-amber-600">
                    {alert.release.version} · {alert.release.environment}
                  </span>
                ) : (
                  <span className="text-stone-500 text-sm">None</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notifications */}
        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900 mb-4">Notification History</h3>
          {alert.notifications.length === 0 ? (
            <p className="text-stone-500 text-sm">No notifications sent</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alert.notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between text-sm p-2 bg-stone-100/80 rounded border border-stone-200"
                >
                  <span className="text-stone-600">{n.targetRef}</span>
                  <span className={n.status === 'SENT' ? 'text-emerald-600' : 'text-red-600'}>
                    {n.status}
                  </span>
                  <span className="text-stone-500">{formatRelativeTime(n.sentAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion */}
      <AiSuggestionCard alertId={alert.id} />

      {/* Breadcrumb Timeline */}
      <BreadcrumbTimeline alertGroupId={alert.id} />

      {/* Correlated Alerts */}
      <CorrelatedAlerts alertId={alert.id} />

      {/* Resolution Memory & Impact Estimation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resolution History */}
        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <span className="text-lg">🔄</span> Resolution History
          </h3>
          {alert.resolutionNotes ? (
            <div className="space-y-4">
              <div className="bg-stone-100/80 border border-stone-200 rounded-lg p-4">
                <p className="text-sm text-stone-600 italic">&quot;{alert.resolutionNotes}&quot;</p>
                {alert.lastResolvedBy && (
                  <p className="text-xs text-stone-500 mt-2">
                    — Last resolved by {alert.lastResolvedBy}
                    {alert.resolvedAt && ` on ${formatDate(alert.resolvedAt)}`}
                  </p>
                )}
              </div>
              {alert.avgResolutionMins && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-stone-500">Avg resolution time:</span>
                  <span className="font-mono font-medium text-stone-900">
                    {alert.avgResolutionMins < 60
                      ? `${alert.avgResolutionMins} min`
                      : `${Math.round((alert.avgResolutionMins / 60) * 10) / 10} hr`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-stone-500 text-sm">No resolution history yet</p>
              <p className="text-xs text-stone-500 mt-1">
                Add resolution notes when resolving alerts to build institutional knowledge
              </p>
            </div>
          )}
        </div>

        {/* Impact Estimation */}
        <div className="bg-white/90 border border-stone-200 rounded-xl p-6">
          <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span> Impact Estimation
          </h3>
          <div className="space-y-4">
            {/* Impact Badge */}
            <div className="flex items-center gap-3">
              {alert.userCount && alert.userCount >= 50 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200">
                  🔴 High Impact
                </span>
              ) : alert.userCount && alert.userCount >= 10 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-600 border border-orange-200">
                  🟠 Medium Impact
                </span>
              ) : alert.velocityPerHour && alert.velocityPerHour >= 10 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-600 border border-yellow-200">
                  ⚡ High Velocity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-500 border border-stone-200">
                  🟢 Low Impact
                </span>
              )}
            </div>

            {/* Metrics */}
            <dl className="grid grid-cols-2 gap-4">
              <div className="bg-stone-100/80 border border-stone-200 rounded-lg p-3">
                <dt className="text-xs text-stone-500 uppercase tracking-wide">Users Affected</dt>
                <dd className="text-2xl font-bold text-stone-900 mt-1">{alert.userCount ?? '—'}</dd>
              </div>
              <div className="bg-stone-100/80 border border-stone-200 rounded-lg p-3">
                <dt className="text-xs text-stone-500 uppercase tracking-wide">Velocity/Hour</dt>
                <dd className="text-2xl font-bold text-stone-900 mt-1">
                  {alert.velocityPerHour ? alert.velocityPerHour.toFixed(1) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white/90 border border-stone-200 rounded-xl p-8 animate-in slide-in-from-bottom-2">
          <h3 className="text-xl font-bold text-stone-900 mb-8 border-b pb-4">Incident Timeline</h3>
          <TimelineFeed alertGroupId={alert.id} />
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div className="animate-in slide-in-from-bottom-2">
          <CollaborationFeed alertGroupId={alert.id} workspaceId={alert.workspaceId} />
        </div>
      )}

      {activeTab === 'postmortem' && (
        <div className="animate-in slide-in-from-bottom-2">
          <PostMortemEditor alertGroupId={alert.id} />
        </div>
      )}

      <Dialog
        open={pagingDialogOpen}
        onOpenChange={(open) => {
          setPagingError(null);
          setPagingDialogOpen(open);
        }}
      >
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Trigger Paging</DialogTitle>
            <DialogDescription className="text-stone-500">
              Notify the on-call rotation using a paging policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Policy</label>
              <select
                value={pagingPolicyId}
                onChange={(e) => setPagingPolicyId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {pagingPolicies.length === 0 ? (
                  <option value="">No paging policies configured</option>
                ) : (
                  pagingPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {pagingError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                <span className="text-lg">⚠️</span> {pagingError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setPagingDialogOpen(false)}
                disabled={pagingLoading}
                className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTriggerPaging}
                disabled={pagingLoading || pagingPolicies.length === 0}
                className="bg-red-600 hover:bg-red-700 text-stone-900"
              >
                {pagingLoading ? 'Paging...' : 'Send Page'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="bg-white border-stone-200 text-stone-900">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Resolve Alert</DialogTitle>
            <DialogDescription className="text-stone-500">
              Optionally add notes about how this alert was resolved. This helps team members fix
              similar issues faster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full px-3 py-2 border border-stone-200 bg-white/70 rounded-lg resize-none text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              rows={4}
              placeholder="What fixed this alert? (e.g., 'Restarted the payments-api pod')"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolutionNotes('');
                }}
                disabled={actionLoading}
                className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-stone-900"
              >
                {actionLoading ? 'Resolving...' : 'Resolve Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
