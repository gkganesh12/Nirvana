'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface RuleActions {
  slackChannelId: string;
  mentionHere?: boolean;
  mentionChannel?: boolean;
  escalateAfterMinutes?: number;
  escalationChannelId?: string;
  sendToTeams?: boolean;
  sendToDiscord?: boolean;
  createPagerDutyIncident?: boolean;
  createOpsgenieAlert?: boolean;
}

interface ActionBuilderProps {
  actions: RuleActions;
  onChange: (actions: RuleActions) => void;
}

interface SlackChannel {
  id: string;
  name: string;
}

export function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/integrations/slack/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const updateAction = <K extends keyof RuleActions>(key: K, value: RuleActions[K]) => {
    onChange({ ...actions, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Slack Channel */}
      <div>
        <label className="block text-sm font-medium mb-1 text-stone-600">Slack Channel</label>
        {loadingChannels ? (
          <p className="text-sm text-stone-500">Loading channels...</p>
        ) : channels.length > 0 ? (
          <select
            value={actions.slackChannelId}
            onChange={(e) => updateAction('slackChannelId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <option value="" className="bg-white">
              Select a channel...
            </option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id} className="bg-white">
                #{channel.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <Input
              value={actions.slackChannelId}
              onChange={(e) => updateAction('slackChannelId', e.target.value)}
              placeholder="Enter channel ID (e.g., C123456)"
              className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500 focus:border-red-500/50 focus:ring-red-500/20"
            />
            <p className="text-xs text-stone-500">
              Connect Slack in Integrations to see available channels.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 pt-4">
        <label className="block text-sm font-medium text-stone-600">Additional Destinations</label>
        <div className="mt-2 grid gap-2">
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.sendToTeams ?? false}
              onChange={(e) => updateAction('sendToTeams', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            Send to Microsoft Teams
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.sendToDiscord ?? false}
              onChange={(e) => updateAction('sendToDiscord', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            Send to Discord
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.createPagerDutyIncident ?? false}
              onChange={(e) => updateAction('createPagerDutyIncident', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            Create PagerDuty incident
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.createOpsgenieAlert ?? false}
              onChange={(e) => updateAction('createOpsgenieAlert', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            Create Opsgenie alert
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Make sure each integration is configured in the Integrations page.
        </p>
      </div>

      {/* Mention Options */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-600">Mentions</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.mentionHere ?? false}
              onChange={(e) => updateAction('mentionHere', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            @here
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.mentionChannel ?? false}
              onChange={(e) => updateAction('mentionChannel', e.target.checked)}
              className="h-4 w-4 rounded border-stone-200 bg-white accent-red-600"
            />
            @channel
          </label>
        </div>
        <p className="text-xs text-stone-500">
          Use @here for online members, @channel for all members.
        </p>
      </div>

      {/* Escalation Settings */}
      <div className="border-t border-stone-200 pt-4 mt-4">
        <label className="block text-sm font-medium mb-2 text-stone-600">
          Escalation (Optional)
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">Escalate after</span>
          <Input
            type="number"
            value={actions.escalateAfterMinutes ?? ''}
            onChange={(e) =>
              updateAction(
                'escalateAfterMinutes',
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            placeholder="15"
            min={1}
            max={1440}
            className="w-20 bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500 focus:border-red-500/50 focus:ring-red-500/20"
          />
          <span className="text-sm text-stone-500">minutes if not acknowledged</span>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          Leave empty to disable escalation. The escalation will be cancelled if the alert is
          acknowledged.
        </p>
      </div>

      {/* Escalation Channel (if escalation is enabled) */}
      {actions.escalateAfterMinutes && actions.escalateAfterMinutes > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1 text-stone-600">
            Escalation Channel (Optional)
          </label>
          {channels.length > 0 ? (
            <select
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <option value="" className="bg-white">
                Same as notification channel
              </option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id} className="bg-white">
                  #{channel.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              placeholder="Optional: Different channel for escalations"
              className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500 focus:border-red-500/50 focus:ring-red-500/20"
            />
          )}
        </div>
      )}
    </div>
  );
}
