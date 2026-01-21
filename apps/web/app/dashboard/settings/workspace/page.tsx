'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WorkspaceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  
  // Impact Threshold Settings
  const [highImpactUserThreshold, setHighImpactUserThreshold] = useState(50);
  const [mediumImpactUserThreshold, setMediumImpactUserThreshold] = useState(10);
  const [highVelocityThreshold, setHighVelocityThreshold] = useState(10);

  useEffect(() => {
    fetch('/api/settings/workspace')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setName(data.name || '');
          setId(data.id || '');
          setCreatedAt(data.createdAt || '');
          // Load impact thresholds
          setHighImpactUserThreshold(data.highImpactUserThreshold ?? 50);
          setMediumImpactUserThreshold(data.mediumImpactUserThreshold ?? 10);
          setHighVelocityThreshold(data.highVelocityThreshold ?? 10);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name,
          highImpactUserThreshold,
          mediumImpactUserThreshold,
          highVelocityThreshold,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Workspace Settings</h1>
        <p className="text-zinc-400">Manage your workspace preferences</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="workspace-id" className="text-zinc-300">Workspace ID</Label>
          <Input 
            id="workspace-id" 
            value={id} 
            disabled 
            className="bg-black/40 border-white/5 font-mono text-sm text-zinc-500" 
          />
          <p className="text-xs text-zinc-500">Unique identifier for this workspace</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-name" className="text-zinc-300">Workspace Name</Label>
          <Input 
            id="workspace-name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-black/20 border-white/10 text-white focus:border-red-500/50 focus:ring-red-500/20"
          />
        </div>
        
        {createdAt && (
          <div className="text-sm text-zinc-500">
            Created on {new Date(createdAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Impact Threshold Configuration */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Impact Thresholds</h2>
          <p className="text-sm text-zinc-400">Configure when alerts are labeled as high or medium impact</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="high-impact" className="text-zinc-300">
              🔴 High Impact Users
            </Label>
            <Input 
              id="high-impact"
              type="number"
              min="1"
              value={highImpactUserThreshold} 
              onChange={(e) => setHighImpactUserThreshold(parseInt(e.target.value) || 50)} 
              className="bg-black/20 border-white/10 text-white focus:border-red-500/50 focus:ring-red-500/20"
            />
            <p className="text-xs text-zinc-500">
              Show 🔴 when ≥ {highImpactUserThreshold} users affected
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medium-impact" className="text-zinc-300">
              🟠 Medium Impact Users
            </Label>
            <Input 
              id="medium-impact"
              type="number"
              min="1"
              value={mediumImpactUserThreshold} 
              onChange={(e) => setMediumImpactUserThreshold(parseInt(e.target.value) || 10)} 
              className="bg-black/20 border-white/10 text-white focus:border-red-500/50 focus:ring-red-500/20"
            />
            <p className="text-xs text-zinc-500">
              Show 🟠 when ≥ {mediumImpactUserThreshold} users affected
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="high-velocity" className="text-zinc-300">
              ⚡ High Velocity (/hr)
            </Label>
            <Input 
              id="high-velocity"
              type="number"
              min="1"
              step="0.1"
              value={highVelocityThreshold} 
              onChange={(e) => setHighVelocityThreshold(parseFloat(e.target.value) || 10)} 
              className="bg-black/20 border-white/10 text-white focus:border-red-500/50 focus:ring-red-500/20"
            />
            <p className="text-xs text-zinc-500">
              Show ⚡ when ≥ {highVelocityThreshold} events/hour
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end max-w-2xl">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white border-0"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

