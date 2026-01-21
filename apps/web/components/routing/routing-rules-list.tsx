'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { RuleFormDialog } from '@/components/routing/rule-form-dialog';
import { DeleteRuleDialog } from '@/components/routing/delete-rule-dialog';

interface RuleCondition {
  field: string;
  operator: string;
  value: string | string[];
}

interface ConditionGroup {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

interface RuleActions {
  slackChannelId: string;
  mentionHere?: boolean;
  escalateAfterMinutes?: number;
}

interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  conditions: ConditionGroup;
  actions: RuleActions;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RulesResponse {
  rules: RoutingRule[];
  total: number;
}

export function RoutingRulesList() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RoutingRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/routing-rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data: RulesResponse = await res.json();
      setRules(data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleEnabled = async (rule: RoutingRule) => {
    const endpoint = rule.enabled
      ? `/api/routing-rules/${rule.id}/disable`
      : `/api/routing-rules/${rule.id}/enable`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle rule');
      await fetchRules();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const formatConditions = (conditions: ConditionGroup): string => {
    const allConditions = conditions.all ?? [];
    const anyConditions = conditions.any ?? [];
    const total = allConditions.length + anyConditions.length;
    return `${total} condition${total !== 1 ? 's' : ''}`;
  };

  const formatActions = (actions: RuleActions): string => {
    const parts: string[] = [];
    if (actions.slackChannelId) parts.push('Slack');
    if (actions.mentionHere) parts.push('@here');
    if (actions.escalateAfterMinutes) parts.push(`Escalate ${actions.escalateAfterMinutes}m`);
    return parts.join(', ') || 'None';
  };

  if (loading) {
    return (
      <Card className="bg-zinc-950 border-red-900/10">
        <CardHeader>
          <CardTitle className="text-white">Routing Rules</CardTitle>
          <CardDescription className="text-zinc-500">Loading rules...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-zinc-950 border-red-900/10">
        <CardHeader>
          <CardTitle className="text-white">Routing Rules</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchRules} className="bg-red-600 hover:bg-red-700 text-white">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-950 border-red-900/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Routing Rules</CardTitle>
            <CardDescription className="text-zinc-500">
              Define conditions to route alerts to specific Slack channels with escalation settings.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            + New Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="mb-4">No routing rules configured yet.</p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="border-red-900/20 text-red-400 hover:bg-red-950/20">Create your first rule</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-12 text-zinc-500">Priority</TableHead>
                  <TableHead className="text-zinc-500">Name</TableHead>
                  <TableHead className="text-zinc-500">Conditions</TableHead>
                  <TableHead className="text-zinc-500">Actions</TableHead>
                  <TableHead className="w-24 text-zinc-500">Status</TableHead>
                  <TableHead className="w-32 text-zinc-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className={`${!rule.enabled ? 'opacity-50' : ''} border-zinc-800 hover:bg-red-900/10 transition-colors`}>
                    <TableCell className="font-mono text-sm text-zinc-400">{rule.priority}</TableCell>
                    <TableCell>
                      <div className="font-medium text-white">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-zinc-500 truncate max-w-xs">
                          {rule.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-400">{formatConditions(rule.conditions)}</TableCell>
                    <TableCell className="text-sm text-zinc-400">{formatActions(rule.actions)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleEnabled(rule)}
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          rule.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRule(rule)}
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRule(rule)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-950/20"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Rule Dialog */}
      <RuleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchRules}
      />

      {/* Edit Rule Dialog */}
      <RuleFormDialog
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
        rule={editingRule ?? undefined}
        onSuccess={fetchRules}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteRuleDialog
        open={!!deletingRule}
        onOpenChange={(open) => !open && setDeletingRule(null)}
        rule={deletingRule}
        onSuccess={fetchRules}
      />
    </>
  );
}
