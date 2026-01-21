'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    defaultChannel: '#alerts',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    escalationEnabled: true,
    escalationMinutes: 15,
  });

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setPrefs(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading preferences...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-zinc-400">Configure how and when you receive alerts</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 max-w-2xl space-y-8">
        
        {/* Default Channel */}
        <div className="space-y-4">
          <Label className="text-zinc-200">Default Notification Channel</Label>
          <div className="grid gap-2">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              value={prefs.defaultChannel} 
              onChange={(e) => setPrefs({...prefs, defaultChannel: e.target.value})}
            >
                <option value="#alerts" className="bg-zinc-900">#alerts</option>
                <option value="#critical" className="bg-zinc-900">#critical</option>
                <option value="#general" className="bg-zinc-900">#general</option>
            </select>
            <p className="text-xs text-zinc-500">Where alerts are sent if no specific routing rule matches</p>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base text-zinc-200">Quiet Hours</Label>
              <p className="text-sm text-zinc-500">Suppress low-priority alerts during specific times</p>
            </div>
            <Switch 
              checked={prefs.quietHoursEnabled} 
              onCheckedChange={(checked) => setPrefs({...prefs, quietHoursEnabled: checked})}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        {/* Escalation */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
            <div>
              <Label className="text-base text-zinc-200">Escalation Policy</Label>
              <p className="text-sm text-zinc-500">Escalate unacknowledged critical alerts</p>
            </div>
            <Switch 
               checked={prefs.escalationEnabled}
               onCheckedChange={(checked) => setPrefs({...prefs, escalationEnabled: checked})}
               className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
