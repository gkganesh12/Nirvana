'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Shield, Plus, List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CalendarView } from '@/components/on-call/calendar-view';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OnCallRotation {
  id: string;
  name: string;
  timezone: string;
  description?: string | null;
  layers: Array<{
    id: string;
    name?: string | null;
    order: number;
    handoffIntervalHours: number;
    startsAt: string;
    endsAt?: string | null;
    restrictionsJson?: {
      days?: string[];
      startTime?: string;
      endTime?: string;
      timezone?: string;
    } | null;
    isShadow?: boolean;
    participants: Array<{
      id: string;
      position: number;
      user: { id: string; email: string; displayName?: string | null };
    }>;
  }>;
  overrides: Array<{
    id: string;
    userId: string;
    reason?: string | null;
    startsAt: string;
    endsAt: string;
    user: { id: string; email: string; displayName?: string | null };
  }>;
}

interface OnCallAssignment {
  rotationId: string;
  source: 'rotation' | 'override' | 'none';
  layerId?: string;
  user: { id: string; email: string; displayName?: string | null } | null;
  startsAt?: string;
  endsAt?: string;
}

interface WorkspaceMember {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
}

interface PagingStep {
  order: number;
  channels: string[];
  delaySeconds: number;
  repeatCount: number;
  repeatIntervalSeconds: number;
}

interface PagingPolicy {
  id: string;
  name: string;
  description?: string | null;
  rotationId: string;
  enabled: boolean;
  steps: PagingStep[];
}

export default function OnCallSchedulePage() {
  const [rotations, setRotations] = useState<OnCallRotation[]>([]);
  const [assignments, setAssignments] = useState<Record<string, OnCallAssignment | null>>({});
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pagingPolicies, setPagingPolicies] = useState<PagingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [layerDialog, setLayerDialog] = useState<{ open: boolean; rotationId?: string }>({
    open: false,
  });
  const [participantDialog, setParticipantDialog] = useState<{
    open: boolean;
    rotationId?: string;
    layerId?: string;
  }>({
    open: false,
  });
  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; rotationId?: string }>({
    open: false,
  });
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [rotationForm, setRotationForm] = useState({ name: '', timezone: 'UTC', description: '' });
  const [layerForm, setLayerForm] = useState({
    name: '',
    order: 0,
    handoffIntervalHours: 168,
    startsAt: '',
    endsAt: '',
    isShadow: false,
    restrictions: {
      days: [] as string[],
      startTime: '',
      endTime: '',
      timezone: 'UTC',
    },
  });
  const [participantForm, setParticipantForm] = useState({ userId: '', position: 0 });
  const [overrideForm, setOverrideForm] = useState({
    userId: '',
    startsAt: '',
    endsAt: '',
    reason: '',
  });
  const [policyForm, setPolicyForm] = useState({
    name: '',
    rotationId: '',
    description: '',
    enabled: true,
    steps: [
      {
        order: 0,
        channels: ['SLACK'],
        delaySeconds: 0,
        repeatCount: 0,
        repeatIntervalSeconds: 0,
      },
    ],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedRotationId, setSelectedRotationId] = useState<string | null>(null);

  const defaultDateTime = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }, []);

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/workspaces/members');
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

  const loadPagingPolicies = async () => {
    try {
      const res = await fetch('/api/paging/policies');
      if (!res.ok) return;
      const data = await res.json();
      setPagingPolicies(data);
    } catch (err) {
      console.error('Failed to load paging policies', err);
    }
  };

  const loadRotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/oncall/rotations');
      if (!res.ok) throw new Error('Failed to load on-call rotations');
      const data = await res.json();
      setRotations(data);
      if (data.length > 0 && !selectedRotationId) {
        setSelectedRotationId(data[0].id);
      }
      setError(null);

      const assignmentEntries = await Promise.all(
        data.map(async (rotation: OnCallRotation) => {
          const whoRes = await fetch(`/api/oncall/who?rotationId=${rotation.id}`);
          if (!whoRes.ok) return [rotation.id, null] as const;
          const whoData = await whoRes.json();
          return [rotation.id, whoData] as const;
        }),
      );

      setAssignments(Object.fromEntries(assignmentEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRotations();
    loadMembers();
    loadPagingPolicies();
  }, []);

  const resetPolicyForm = (rotationId?: string) => {
    setPolicyForm({
      name: '',
      rotationId: rotationId || rotations[0]?.id || '',
      description: '',
      enabled: true,
      steps: [
        {
          order: 0,
          channels: ['SLACK'],
          delaySeconds: 0,
          repeatCount: 0,
          repeatIntervalSeconds: 0,
        },
      ],
    });
  };

  const handleCreateRotation = async () => {
    setFormError(null);
    if (!rotationForm.name.trim()) {
      setFormError('Rotation name is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/oncall/rotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rotationForm.name.trim(),
          timezone: rotationForm.timezone.trim() || 'UTC',
          description: rotationForm.description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create rotation');
      }

      setRotationDialogOpen(false);
      setRotationForm({ name: '', timezone: 'UTC', description: '' });
      await loadRotations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create rotation');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLayer = async () => {
    if (!layerDialog.rotationId) return;
    setFormError(null);
    if (!layerForm.startsAt) {
      setFormError('Layer start time is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: layerForm.name.trim() || undefined,
        order: layerForm.order,
        handoffIntervalHours: layerForm.handoffIntervalHours,
        startsAt: new Date(layerForm.startsAt).toISOString(),
        endsAt: layerForm.endsAt ? new Date(layerForm.endsAt).toISOString() : undefined,
        isShadow: layerForm.isShadow,
        restrictionsJson:
          layerForm.restrictions.days.length ||
          layerForm.restrictions.startTime ||
          layerForm.restrictions.endTime
            ? {
                days: layerForm.restrictions.days,
                startTime: layerForm.restrictions.startTime || undefined,
                endTime: layerForm.restrictions.endTime || undefined,
                timezone: layerForm.restrictions.timezone || 'UTC',
              }
            : undefined,
      };
      const res = await fetch(`/api/oncall/rotations/${layerDialog.rotationId}/layers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create layer');
      }

      setLayerDialog({ open: false });
      setLayerForm({
        name: '',
        order: 0,
        handoffIntervalHours: 168,
        startsAt: '',
        endsAt: '',
        isShadow: false,
        restrictions: { days: [], startTime: '', endTime: '', timezone: 'UTC' },
      });
      await loadRotations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create layer');
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!participantDialog.rotationId || !participantDialog.layerId) return;
    setFormError(null);
    if (!participantForm.userId) {
      setFormError('Select a responder');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(
        `/api/oncall/rotations/${participantDialog.rotationId}/layers/${participantDialog.layerId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: participantForm.userId,
            position: participantForm.position,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add participant');
      }

      setParticipantDialog({ open: false });
      setParticipantForm({ userId: '', position: 0 });
      await loadRotations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add participant');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideDialog.rotationId) return;
    setFormError(null);
    if (!overrideForm.userId || !overrideForm.startsAt || !overrideForm.endsAt) {
      setFormError('Override user and time range are required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId: overrideForm.userId,
        startsAt: new Date(overrideForm.startsAt).toISOString(),
        endsAt: new Date(overrideForm.endsAt).toISOString(),
        reason: overrideForm.reason.trim() || undefined,
      };
      const url = editingOverrideId
        ? `/api/oncall/rotations/${overrideDialog.rotationId}/overrides/${editingOverrideId}`
        : `/api/oncall/rotations/${overrideDialog.rotationId}/overrides`;
      const method = editingOverrideId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save override');
      }

      setOverrideDialog({ open: false });
      setOverrideForm({ userId: '', startsAt: '', endsAt: '', reason: '' });
      setEditingOverrideId(null);
      await loadRotations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (rotationId: string, overrideId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/oncall/rotations/${rotationId}/overrides/${overrideId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove override');
      }
      await loadRotations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to remove override');
    } finally {
      setSaving(false);
    }
  };

  const applyQuickDuration = (hours: number) => {
    if (!overrideForm.startsAt) return;
    const start = new Date(overrideForm.startsAt);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setOverrideForm((prev) => ({ ...prev, endsAt: end.toISOString().slice(0, 16) }));
  };

  const handleSavePolicy = async () => {
    setFormError(null);
    if (!policyForm.name.trim()) {
      setFormError('Policy name is required');
      return;
    }
    if (!policyForm.rotationId) {
      setFormError('Select a rotation');
      return;
    }
    if (policyForm.steps.length === 0) {
      setFormError('At least one paging step is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: policyForm.name.trim(),
        rotationId: policyForm.rotationId,
        description: policyForm.description.trim() || undefined,
        enabled: policyForm.enabled,
        steps: policyForm.steps.map((step, index) => ({
          order: index,
          channels: step.channels,
          delaySeconds: step.delaySeconds,
          repeatCount: step.repeatCount,
          repeatIntervalSeconds: step.repeatIntervalSeconds,
        })),
      };

      const url = editingPolicyId
        ? `/api/paging/policies/${editingPolicyId}`
        : '/api/paging/policies';
      const method = editingPolicyId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save policy');
      }

      setPolicyDialogOpen(false);
      setEditingPolicyId(null);
      resetPolicyForm();
      await loadPagingPolicies();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">On-call Schedule</h1>
          <p className="mt-1 text-stone-600">Manage rotations and incident responders</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-4 flex items-center rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-stone-900 text-white hover:bg-stone-800" : "text-stone-500 hover:text-stone-900"
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="mr-2 h-3.5 w-3.5" />
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-bold transition-all",
                viewMode === 'calendar' ? "bg-stone-900 text-white hover:bg-stone-800" : "text-stone-500 hover:text-stone-900"
              )}
              onClick={() => setViewMode('calendar')}
            >
              <Grid className="mr-2 h-3.5 w-3.5" />
              Calendar
            </Button>
          </div>
          <Button
            className="bg-red-600 text-stone-900 font-bold hover:bg-red-700 shadow-md shadow-red-600/10"
            onClick={() => {
              setFormError(null);
              setRotationDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Rotation
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' && rotations.length > 0 && (
        <div className="mb-6 flex animate-in fade-in slide-in-from-top-4 duration-500 items-center gap-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Select Rotation:</span>
          <div className="flex flex-wrap gap-2">
            {rotations.map(r => (
              <Button
                key={r.id}
                variant={selectedRotationId === r.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRotationId(r.id)}
                className={cn(
                  "h-8 text-xs font-semibold transition-all",
                  selectedRotationId === r.id 
                    ? "bg-stone-800 text-white border-stone-800" 
                    : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                )}
              >
                {r.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
        </div>
      )}

      {!loading && rotations.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-8 text-center text-sm text-stone-500 shadow-lg shadow-stone-900/5">
          No on-call rotations yet. Create one to start scheduling responders.
        </div>
      )}

      {viewMode === 'calendar' && selectedRotationId && (
        <CalendarView 
          rotationId={selectedRotationId} 
          rotationName={rotations.find(r => r.id === selectedRotationId)?.name || ''} 
        />
      )}

      {viewMode === 'list' && rotations.map((rotation) => {
        const assignment = assignments[rotation.id];
        const displayName =
          assignment?.user?.displayName || assignment?.user?.email || 'Unassigned';
        const initials = displayName.charAt(0).toUpperCase();

        return (
          <div
            key={rotation.id}
            className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="rounded-lg bg-red-50 p-3">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-800">{rotation.name}</h3>
                <p className="text-sm text-stone-500">
                  {rotation.description || `Timezone: ${rotation.timezone}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-stone-300 hover:bg-stone-50/70">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-rose-100 text-xs font-bold text-stone-700">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{displayName}</p>
                    {assignment?.startsAt && assignment?.endsAt ? (
                      <p className="flex items-center gap-1 text-xs text-stone-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(assignment.startsAt).toLocaleDateString()} -{' '}
                        {new Date(assignment.endsAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500">No active shift window</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      assignment?.user
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-stone-200 bg-stone-100 text-stone-500'
                    }`}
                  >
                    {assignment?.user ? 'Active' : 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  onClick={() => {
                    setFormError(null);
                    setLayerDialog({ open: true, rotationId: rotation.id });
                    setLayerForm({
                      name: '',
                      order: rotation.layers.length,
                      handoffIntervalHours: 168,
                      startsAt: defaultDateTime,
                      endsAt: '',
                      isShadow: false,
                      restrictions: {
                        days: [],
                        startTime: '',
                        endTime: '',
                        timezone: rotation.timezone || 'UTC',
                      },
                    });
                  }}
                >
                  Add Layer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  onClick={() => {
                    setFormError(null);
                    setOverrideDialog({ open: true, rotationId: rotation.id });
                    setEditingOverrideId(null);
                    setOverrideForm({
                      userId: members[0]?.id ?? '',
                      startsAt: defaultDateTime,
                      endsAt: '',
                      reason: '',
                    });
                  }}
                >
                  Add Override
                </Button>
              </div>

              {rotation.layers.length > 0 && (
                <div className="space-y-3">
                  {rotation.layers.map((layer) => (
                    <div
                      key={layer.id}
                      className="rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            {layer.name || `Layer ${layer.order + 1}`}
                          </p>
                          <p className="text-xs text-stone-500">
                            Handoff every {layer.handoffIntervalHours}h · Starts{' '}
                            {new Date(layer.startsAt).toLocaleString()}
                            {layer.isShadow ? ' · Shadow' : ''}
                          </p>
                          {layer.restrictionsJson?.startTime && layer.restrictionsJson?.endTime && (
                            <p className="text-[10px] text-stone-500">
                              Shift {layer.restrictionsJson.startTime}-
                              {layer.restrictionsJson.endTime}{' '}
                              {layer.restrictionsJson.timezone || 'UTC'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-stone-500 hover:text-stone-900"
                          onClick={() => {
                            setFormError(null);
                            setParticipantDialog({
                              open: true,
                              rotationId: rotation.id,
                              layerId: layer.id,
                            });
                            setParticipantForm({
                              userId: members[0]?.id ?? '',
                              position: layer.participants.length,
                            });
                          }}
                        >
                          Add Responder
                        </Button>
                      </div>
                      {layer.participants.length > 0 ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {layer.participants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">
                                  {(participant.user.displayName || participant.user.email)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-stone-800">
                                    {participant.user.displayName || participant.user.email}
                                  </p>
                                  <p className="text-[10px] text-stone-500">
                                    Position {participant.position + 1}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-stone-500">No responders added yet.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {rotation.overrides.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Active Overrides
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {rotation.overrides.map((override) => (
                      <div
                        key={override.id}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-stone-800">
                              {override.user.displayName || override.user.email}
                            </p>
                            <p className="text-[10px] text-stone-500">
                              {new Date(override.startsAt).toLocaleString()} -{' '}
                              {new Date(override.endsAt).toLocaleString()}
                            </p>
                            {override.reason && (
                              <p className="text-[10px] text-stone-500 mt-1">{override.reason}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-stone-500 hover:text-stone-900"
                              onClick={() => {
                                setFormError(null);
                                setEditingOverrideId(override.id);
                                setOverrideDialog({ open: true, rotationId: rotation.id });
                                setOverrideForm({
                                  userId: override.userId,
                                  startsAt: new Date(override.startsAt).toISOString().slice(0, 16),
                                  endsAt: new Date(override.endsAt).toISOString().slice(0, 16),
                                  reason: override.reason ?? '',
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteOverride(rotation.id, override.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {viewMode === 'list' && (
        <>
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-800">Paging Policies</h3>
            <p className="text-sm text-stone-500">Define escalation steps for on-call rotations.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-stone-200 text-stone-700 hover:bg-stone-50"
            onClick={() => {
              setFormError(null);
              setEditingPolicyId(null);
              resetPolicyForm();
              setPolicyDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>

        {pagingPolicies.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No paging policies yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pagingPolicies.map((policy) => (
              <div
                key={policy.id}
                className="rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{policy.name}</p>
                    <p className="text-xs text-stone-500">
                      {policy.description || 'No description'} · Steps {policy.steps.length}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stone-500 hover:text-stone-900"
                    onClick={() => {
                      setFormError(null);
                      setEditingPolicyId(policy.id);
                      setPolicyForm({
                        name: policy.name,
                        rotationId: policy.rotationId,
                        description: policy.description || '',
                        enabled: policy.enabled,
                        steps: policy.steps.map((step) => ({
                          order: step.order,
                          channels: step.channels,
                          delaySeconds: step.delaySeconds,
                          repeatCount: step.repeatCount,
                          repeatIntervalSeconds: step.repeatIntervalSeconds,
                        })),
                      });
                      setPolicyDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {policy.steps.map((step) => (
                    <span
                      key={`${policy.id}-${step.order}`}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600"
                    >
                      Step {step.order + 1}: {step.channels.join(', ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700">
            <Clock className="h-4 w-4 text-sky-600" />
            Escalation Policy
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[10px] font-bold text-sky-700">
                1
              </div>
              <div>
                <p className="text-xs font-medium text-stone-800">Notify Primary On-call</p>
                <p className="text-[10px] text-stone-500">Immediate notification via Slack/Email</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-[10px] font-bold text-stone-500">
                2
              </div>
              <div>
                <p className="text-xs font-medium text-stone-800">Escalate to Admin</p>
                <p className="text-[10px] text-stone-500">If unacknowledged after 15 minutes</p>
              </div>
            </div>
          </div>
        </div>

        </div>
      </>
    )}

    <Dialog
        open={policyDialogOpen}
        onOpenChange={(open) => {
          setFormError(null);
          setPolicyDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl bg-white border-stone-200 text-stone-900 shadow-2xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">
              {editingPolicyId ? 'Edit Paging Policy' : 'Create Paging Policy'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Set escalation steps for an on-call rotation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Policy Name *</label>
              <Input
                value={policyForm.name}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Critical Escalation"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Rotation *</label>
              <select
                value={policyForm.rotationId}
                onChange={(e) => setPolicyForm((prev) => ({ ...prev, rotationId: e.target.value }))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {rotations.length === 0 ? (
                  <option value="">No rotations found</option>
                ) : (
                  rotations.map((rotation) => (
                    <option key={rotation.id} value={rotation.id}>
                      {rotation.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Description</label>
              <Textarea
                value={policyForm.description}
                onChange={(e) =>
                  setPolicyForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Who is this policy for?"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-stone-700">Paging Steps</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  onClick={() =>
                    setPolicyForm((prev) => ({
                      ...prev,
                      steps: [
                        ...prev.steps,
                        {
                          order: prev.steps.length,
                          channels: ['SLACK'],
                          delaySeconds: 0,
                          repeatCount: 0,
                          repeatIntervalSeconds: 0,
                        },
                      ],
                    }))
                  }
                >
                  Add Step
                </Button>
              </div>

              {policyForm.steps.map((step, index) => (
                <div
                  key={`step-${index}`}
                  className="rounded-xl border border-stone-200 bg-stone-50/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-stone-500">
                      Step {index + 1}
                    </p>
                    {policyForm.steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-stone-500 hover:text-stone-900"
                        onClick={() =>
                          setPolicyForm((prev) => ({
                            ...prev,
                            steps: prev.steps.filter((_, stepIndex) => stepIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-stone-600">
                        Channels
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['SLACK', 'EMAIL', 'SMS', 'VOICE'].map((channel) => (
                          <label
                            key={channel}
                            className="flex items-center gap-2 text-xs text-stone-600"
                          >
                            <input
                              type="checkbox"
                              checked={step.channels.includes(channel)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPolicyForm((prev) => ({
                                  ...prev,
                                  steps: prev.steps.map((item, stepIndex) => {
                                    if (stepIndex !== index) return item;
                                    const channels = checked
                                      ? Array.from(new Set([...item.channels, channel]))
                                      : item.channels.filter((value) => value !== channel);
                                    return { ...item, channels };
                                  }),
                                }));
                              }}
                            />
                            {channel}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-stone-600">
                          Delay (seconds)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={step.delaySeconds}
                          onChange={(e) =>
                            setPolicyForm((prev) => ({
                              ...prev,
                              steps: prev.steps.map((item, stepIndex) =>
                                stepIndex === index
                                  ? { ...item, delaySeconds: Number(e.target.value) }
                                  : item,
                              ),
                            }))
                          }
                          className="bg-white/70 border-stone-200 text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-stone-600">
                          Repeat Count
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={step.repeatCount}
                          onChange={(e) =>
                            setPolicyForm((prev) => ({
                              ...prev,
                              steps: prev.steps.map((item, stepIndex) =>
                                stepIndex === index
                                  ? { ...item, repeatCount: Number(e.target.value) }
                                  : item,
                              ),
                            }))
                          }
                          className="bg-white/70 border-stone-200 text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-stone-600">
                          Repeat Interval (seconds)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={step.repeatIntervalSeconds}
                          onChange={(e) =>
                            setPolicyForm((prev) => ({
                              ...prev,
                              steps: prev.steps.map((item, stepIndex) =>
                                stepIndex === index
                                  ? { ...item, repeatIntervalSeconds: Number(e.target.value) }
                                  : item,
                              ),
                            }))
                          }
                          className="bg-white/70 border-stone-200 text-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {formError && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span> {formError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPolicyDialogOpen(false)}
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSavePolicy}
              className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
            >
              {saving ? 'Saving...' : editingPolicyId ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rotationDialogOpen}
        onOpenChange={(open) => {
          setFormError(null);
          setRotationDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-xl bg-white border-stone-200 text-stone-900 shadow-2xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">Create Rotation</DialogTitle>
            <DialogDescription className="text-stone-500">
              Define a new on-call rotation and timezone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Name *</label>
              <Input
                value={rotationForm.name}
                onChange={(e) => setRotationForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Primary On-call"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Timezone</label>
              <Input
                value={rotationForm.timezone}
                onChange={(e) => setRotationForm((prev) => ({ ...prev, timezone: e.target.value }))}
                placeholder="UTC"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Description</label>
              <Textarea
                value={rotationForm.description}
                onChange={(e) =>
                  setRotationForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Who is covered by this rotation?"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
          </div>
          {formError && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span> {formError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRotationDialogOpen(false)}
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleCreateRotation}
              className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
            >
              {saving ? 'Creating...' : 'Create Rotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={layerDialog.open}
        onOpenChange={(open) => {
          setFormError(null);
          setLayerDialog({ open });
        }}
      >
        <DialogContent className="max-w-xl bg-white border-stone-200 text-stone-900 shadow-2xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">Add Layer</DialogTitle>
            <DialogDescription className="text-stone-500">
              Set the layer schedule and handoff cadence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Layer Name</label>
              <Input
                value={layerForm.name}
                onChange={(e) => setLayerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Primary rotation"
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">Order</label>
                <Input
                  type="number"
                  min={0}
                  value={layerForm.order}
                  onChange={(e) =>
                    setLayerForm((prev) => ({ ...prev, order: Number(e.target.value) }))
                  }
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">
                  Handoff (hours)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={layerForm.handoffIntervalHours}
                  onChange={(e) =>
                    setLayerForm((prev) => ({
                      ...prev,
                      handoffIntervalHours: Number(e.target.value),
                    }))
                  }
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">Starts At *</label>
                <Input
                  type="datetime-local"
                  value={layerForm.startsAt}
                  onChange={(e) => setLayerForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">Ends At</label>
                <Input
                  type="datetime-local"
                  value={layerForm.endsAt}
                  onChange={(e) => setLayerForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={layerForm.isShadow}
                onChange={(e) => setLayerForm((prev) => ({ ...prev, isShadow: e.target.checked }))}
                className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500/30"
              />
              <span className="text-sm text-stone-600">Shadow layer (notify only)</span>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Shift Restrictions
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium mb-1 text-stone-600">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={layerForm.restrictions.startTime}
                    onChange={(e) =>
                      setLayerForm((prev) => ({
                        ...prev,
                        restrictions: { ...prev.restrictions, startTime: e.target.value },
                      }))
                    }
                    className="bg-white/70 border-stone-200 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-stone-600">End Time</label>
                  <Input
                    type="time"
                    value={layerForm.restrictions.endTime}
                    onChange={(e) =>
                      setLayerForm((prev) => ({
                        ...prev,
                        restrictions: { ...prev.restrictions, endTime: e.target.value },
                      }))
                    }
                    className="bg-white/70 border-stone-200 text-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-stone-600">Timezone</label>
                <Input
                  value={layerForm.restrictions.timezone}
                  onChange={(e) =>
                    setLayerForm((prev) => ({
                      ...prev,
                      restrictions: { ...prev.restrictions, timezone: e.target.value },
                    }))
                  }
                  placeholder="UTC"
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                  <label key={day} className="flex items-center gap-2 text-xs text-stone-600">
                    <input
                      type="checkbox"
                      checked={layerForm.restrictions.days.includes(day)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLayerForm((prev) => ({
                          ...prev,
                          restrictions: {
                            ...prev.restrictions,
                            days: checked
                              ? [...prev.restrictions.days, day]
                              : prev.restrictions.days.filter((value) => value !== day),
                          },
                        }));
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {formError && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span> {formError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLayerDialog({ open: false })}
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleCreateLayer}
              className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
            >
              {saving ? 'Saving...' : 'Add Layer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={participantDialog.open}
        onOpenChange={(open) => {
          setFormError(null);
          setParticipantDialog({ open });
        }}
      >
        <DialogContent className="max-w-xl bg-white border-stone-200 text-stone-900 shadow-2xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">Add Responder</DialogTitle>
            <DialogDescription className="text-stone-500">
              Assign a team member to the rotation layer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Responder *</label>
              <select
                value={participantForm.userId}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, userId: e.target.value }))
                }
                className="flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {members.length === 0 ? (
                  <option value="">No members found</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.email}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">
                Order Position
              </label>
              <Input
                type="number"
                min={0}
                value={participantForm.position}
                onChange={(e) =>
                  setParticipantForm((prev) => ({ ...prev, position: Number(e.target.value) }))
                }
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
          </div>
          {formError && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span> {formError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setParticipantDialog({ open: false })}
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleAddParticipant}
              className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
            >
              {saving ? 'Saving...' : 'Add Responder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={overrideDialog.open}
        onOpenChange={(open) => {
          setFormError(null);
          setOverrideDialog({ open });
        }}
      >
        <DialogContent className="max-w-xl bg-white border-stone-200 text-stone-900 shadow-2xl shadow-black/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-900">
              {editingOverrideId ? 'Edit Override' : 'Add Override'}
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Temporarily replace the on-call responder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">
                Override User *
              </label>
              <select
                value={overrideForm.userId}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, userId: e.target.value }))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {members.length === 0 ? (
                  <option value="">No members found</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.email}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">Starts At *</label>
                <Input
                  type="datetime-local"
                  value={overrideForm.startsAt}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-stone-600">Ends At *</label>
                <Input
                  type="datetime-local"
                  value={overrideForm.endsAt}
                  onChange={(e) => setOverrideForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                  className="bg-white/70 border-stone-200 text-stone-900"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[4, 8, 24].map((hours) => (
                <Button
                  key={hours}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-stone-200 text-stone-700 hover:bg-stone-50"
                  onClick={() => applyQuickDuration(hours)}
                >
                  +{hours}h
                </Button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-stone-600">Reason</label>
              <Textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Vacation coverage, incident surge, etc."
                className="bg-white/70 border-stone-200 text-stone-900"
              />
            </div>
          </div>
          {formError && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
              <span className="text-lg">⚠️</span> {formError}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOverrideDialog({ open: false })}
              className="text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleCreateOverride}
              className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
            >
              {saving ? 'Saving...' : 'Add Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
