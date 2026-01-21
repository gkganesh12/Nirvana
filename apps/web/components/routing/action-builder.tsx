'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface RuleActions {
  slackChannelId: string;
  mentionHere?: boolean;
  mentionChannel?: boolean;
  escalateAfterMinutes?: number;
  escalationChannelId?: string;
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
        <label className="block text-sm font-medium mb-1 text-zinc-300">Slack Channel *</label>
        {loadingChannels ? (
          <p className="text-sm text-zinc-500">Loading channels...</p>
        ) : channels.length > 0 ? (
          <select
            value={actions.slackChannelId}
            onChange={(e) => updateAction('slackChannelId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <option value="" className="bg-zinc-900">Select a channel...</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id} className="bg-zinc-900">
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
              className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-red-500/20"
            />
            <p className="text-xs text-zinc-500">
              Connect Slack in Integrations to see available channels.
            </p>
          </div>
        )}
      </div>

      {/* Mention Options */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Mentions</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.mentionHere ?? false}
              onChange={(e) => updateAction('mentionHere', e.target.checked)}
              className="rounded border-white/20 bg-black/20 accent-red-600 h-4 w-4"
            />
            @here
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={actions.mentionChannel ?? false}
              onChange={(e) => updateAction('mentionChannel', e.target.checked)}
              className="rounded border-white/20 bg-black/20 accent-red-600 h-4 w-4"
            />
            @channel
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          Use @here for online members, @channel for all members.
        </p>
      </div>

      {/* Escalation Settings */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <label className="block text-sm font-medium mb-2 text-zinc-300">Escalation (Optional)</label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Escalate after</span>
          <Input
            type="number"
            value={actions.escalateAfterMinutes ?? ''}
            onChange={(e) =>
              updateAction('escalateAfterMinutes', e.target.value ? parseInt(e.target.value) : undefined)
            }
            placeholder="15"
            min={1}
            max={1440}
            className="w-20 bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-red-500/20"
          />
          <span className="text-sm text-zinc-400">minutes if not acknowledged</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Leave empty to disable escalation. The escalation will be cancelled if the alert is acknowledged.
        </p>
      </div>

      {/* Escalation Channel (if escalation is enabled) */}
      {actions.escalateAfterMinutes && actions.escalateAfterMinutes > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1 text-zinc-300">Escalation Channel (Optional)</label>
          {channels.length > 0 ? (
            <select
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <option value="" className="bg-zinc-900">Same as notification channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id} className="bg-zinc-900">
                  #{channel.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              placeholder="Optional: Different channel for escalations"
              className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-red-500/20"
            />
          )}
        </div>
      )}
    </div>
  );
}
