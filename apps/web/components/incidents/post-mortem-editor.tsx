'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Sparkles, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface PostMortem {
  id?: string;
  title: string;
  summary: string | null;
  impact: string | null;
  rootCause: string | null;
  status: 'DRAFT' | 'REVIEWING' | 'PUBLISHED';
  actionItems: ActionItem[];
}

interface PostMortemEditorProps {
  alertGroupId: string;
}

export function PostMortemEditor({ alertGroupId }: PostMortemEditorProps) {
  const [data, setData] = useState<PostMortem>({
    title: '',
    summary: '',
    impact: '',
    rootCause: '',
    status: 'DRAFT',
    actionItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPostMortem();
  }, [alertGroupId]);

  const fetchPostMortem = async () => {
    try {
      const res = await fetch(`/api/incidents/${alertGroupId}/postmortem`);
      if (res.ok) {
        const result = await res.json();
        if (result) setData(result);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (statusOverride?: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/incidents/${alertGroupId}/postmortem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: statusOverride || data.status }),
      });
      if (res.ok) {
        setMessage('Changes saved successfully');
        await fetchPostMortem();
      }
    } catch (error) {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAIByDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch(`/api/incidents/${alertGroupId}/postmortem/draft`, { method: 'POST' });
      const draft = await res.json();
      setData(prev => ({
        ...prev,
        title: draft.title || prev.title,
        summary: draft.summary || prev.summary,
        impact: draft.impact || prev.impact,
        rootCause: draft.rootCause || prev.rootCause,
      }));
    } catch (error) {
      console.error('Draft generation failed');
    } finally {
      setDrafting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500 animate-pulse">Loading report...</div>;

  return (
    <div className="space-y-8 bg-white/50 rounded-2xl p-6 border border-stone-200">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Post-Mortem Report
            {data.status === 'PUBLISHED' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </h2>
          <p className="text-sm text-stone-500">Analyze the incident and document learnings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleAIByDraft} 
            disabled={drafting}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {drafting ? 'Analyzing...' : 'AI Magic Draft'}
          </Button>
          <Button 
            onClick={() => handleSave()} 
            disabled={saving}
            className="bg-stone-900 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {data.status !== 'PUBLISHED' && (
            <Button 
              onClick={() => handleSave('PUBLISHED')} 
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-lg border border-emerald-100 animate-in fade-in">
          {message}
        </div>
      )}

      <div className="grid gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Report Title</label>
          <Input 
            value={data.title} 
            onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., API Gateway Latency Spike - Jan 2024"
            className="text-lg font-bold border-stone-200"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Executive Summary</label>
            <Textarea 
              value={data.summary || ''} 
              onChange={e => setData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="What happened at a high level?"
              rows={8}
              className="border-stone-200 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Root Cause Analysis</label>
            <Textarea 
              value={data.rootCause || ''} 
              onChange={e => setData(prev => ({ ...prev, rootCause: e.target.value }))}
              placeholder="Why did it happen?"
              rows={8}
              className="border-stone-200 resize-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Impact Analysis</label>
          <Textarea 
            value={data.impact || ''} 
            onChange={e => setData(prev => ({ ...prev, impact: e.target.value }))}
            placeholder="Describe the blast radius and user impact..."
            rows={4}
            className="border-stone-200 resize-none"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Action Items</label>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-stone-500 hover:text-red-700">
              <Plus className="w-3 h-3 mr-1" /> Add Action Item
            </Button>
          </div>
          <div className="space-y-2">
            {data.actionItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-stone-50 border border-stone-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-stone-300" />
                  <span className="text-sm text-stone-700">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-bold">{item.priority}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{item.status}</span>
                </div>
              </div>
            ))}
            {data.actionItems.length === 0 && (
              <p className="text-xs italic text-stone-400">No action items defined yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
