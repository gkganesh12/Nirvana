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
  const [twilio, setTwilio] = useState({
    configured: false,
    accountSid: '',
    authToken: '',
    fromNumber: '',
    accountSidMasked: '',
  });
  const [twilioTest, setTwilioTest] = useState({ to: '', channel: 'SMS' });
  const [twilioMessage, setTwilioMessage] = useState<string | null>(null);

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

    fetch('/api/settings/twilio')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setTwilio((prev) => ({
            ...prev,
            configured: data.configured ?? false,
            accountSidMasked: data.accountSidMasked ?? '',
            fromNumber: data.fromNumber ?? '',
          }));
        }
      })
      .catch((err) => console.error(err));
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

  const handleSaveTwilio = async () => {
    try {
      setSaving(true);
      setTwilioMessage(null);
      const res = await fetch('/api/settings/twilio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: twilio.accountSid,
          authToken: twilio.authToken,
          fromNumber: twilio.fromNumber,
        }),
      });
      if (!res.ok) throw new Error('Failed to update Twilio settings');
      setTwilioMessage('Twilio settings saved');
    } catch (error) {
      console.error(error);
      setTwilioMessage('Failed to save Twilio settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTwilio = async () => {
    try {
      setSaving(true);
      setTwilioMessage(null);
      const res = await fetch('/api/settings/twilio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioTest),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Test failed');
      setTwilioMessage('Test sent successfully');
    } catch (error) {
      console.error(error);
      setTwilioMessage('Twilio test failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading preferences...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Notifications</h1>
        <p className="text-stone-500">Configure how and when you receive alerts</p>
      </div>

      <div className="bg-white/90 border border-stone-200 rounded-xl p-6 max-w-2xl space-y-8">
        {/* Default Channel */}
        <div className="space-y-4">
          <Label className="text-stone-700">Default Notification Channel</Label>
          <div className="grid gap-2">
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 ring-offset-background placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              value={prefs.defaultChannel}
              onChange={(e) => setPrefs({ ...prefs, defaultChannel: e.target.value })}
            >
              <option value="#alerts" className="bg-white">
                #alerts
              </option>
              <option value="#critical" className="bg-white">
                #critical
              </option>
              <option value="#general" className="bg-white">
                #general
              </option>
            </select>
            <p className="text-xs text-stone-500">
              Where alerts are sent if no specific routing rule matches
            </p>
          </div>
        </div>

        <hr className="border-stone-200" />

        <div className="space-y-4">
          <div>
            <Label className="text-base text-stone-700">Twilio Wake-up Routing</Label>
            <p className="text-sm text-stone-500">
              Configure SMS/voice wake-up alerts for critical paging.
            </p>
          </div>

          <div className="grid gap-3">
            <Label className="text-stone-600 text-sm">Account SID</Label>
            <input
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              value={twilio.accountSid}
              onChange={(e) => setTwilio((prev) => ({ ...prev, accountSid: e.target.value }))}
              placeholder={twilio.accountSidMasked || 'ACxxxxxxxx'}
            />
            <Label className="text-stone-600 text-sm">Auth Token</Label>
            <input
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              type="password"
              value={twilio.authToken}
              onChange={(e) => setTwilio((prev) => ({ ...prev, authToken: e.target.value }))}
              placeholder="••••••••"
            />
            <Label className="text-stone-600 text-sm">From Number</Label>
            <input
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              value={twilio.fromNumber}
              onChange={(e) => setTwilio((prev) => ({ ...prev, fromNumber: e.target.value }))}
              placeholder="+15551234567"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveTwilio}
                disabled={saving}
                className="border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Save Twilio
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <Label className="text-stone-600 text-sm">Test Number</Label>
            <input
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
              value={twilioTest.to}
              onChange={(e) => setTwilioTest((prev) => ({ ...prev, to: e.target.value }))}
              placeholder="+15551234567"
            />
            <select
              value={twilioTest.channel}
              onChange={(e) => setTwilioTest((prev) => ({ ...prev, channel: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900"
            >
              <option value="SMS">SMS</option>
              <option value="VOICE">Voice</option>
            </select>
            <Button
              variant="outline"
              onClick={handleTestTwilio}
              disabled={saving || !twilioTest.to}
              className="border-stone-200 text-stone-700 hover:bg-stone-50"
            >
              Send Test
            </Button>
            {twilioMessage && <p className="text-xs text-stone-500">{twilioMessage}</p>}
          </div>

          <div className="text-xs text-stone-500">
            Configure Twilio to send inbound SMS to
            <span className="font-mono"> /api/v1/twilio/sms</span> and voice to
            <span className="font-mono"> /api/v1/twilio/voice</span> on your API base URL.
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base text-stone-700">Quiet Hours</Label>
              <p className="text-sm text-stone-500">
                Suppress low-priority alerts during specific times
              </p>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(checked) => setPrefs({ ...prefs, quietHoursEnabled: checked })}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        {/* Escalation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base text-stone-700">Escalation Policy</Label>
              <p className="text-sm text-stone-500">Escalate unacknowledged critical alerts</p>
            </div>
            <Switch
              checked={prefs.escalationEnabled}
              onCheckedChange={(checked) => setPrefs({ ...prefs, escalationEnabled: checked })}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-stone-900 border-0"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
