'use client';

import { Calendar, Clock, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MOCK_SCHEDULE = [
  { id: '1', user: 'Ganesh Khetawat', start: '2026-01-20T00:00:00Z', end: '2026-01-27T00:00:00Z', status: 'Active' },
  { id: '2', user: 'System Admin', start: '2026-01-27T00:00:00Z', end: '2026-02-03T00:00:00Z', status: 'Upcoming' },
];

export default function OnCallSchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">On-call Schedule</h1>
          <p className="text-zinc-400 mt-1">Manage rotations and incident responders</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Shift
        </Button>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-red-900/20 rounded-lg">
             <Shield className="w-6 h-6 text-red-400" />
           </div>
           <div>
             <h3 className="text-lg font-semibold text-white">Primary Rotation</h3>
             <p className="text-sm text-zinc-500">Weekly shift handoff every Tuesday at 10:00 AM</p>
           </div>
        </div>

        <div className="space-y-4">
          {MOCK_SCHEDULE.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 hover:border-red-900/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-white">
                  {shift.user.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{shift.user}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(shift.start).toLocaleDateString()} - {new Date(shift.end).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  shift.status === 'Active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                }`}>
                  {shift.status}
                </span>
                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Escalation Policy
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-900/20 flex items-center justify-center text-[10px] text-blue-400 font-bold border border-blue-900/30">1</div>
              <div>
                <p className="text-xs font-medium text-white">Notify Primary On-call</p>
                <p className="text-[10px] text-zinc-500">Immediate notification via Slack/Email</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold border border-white/5">2</div>
              <div>
                <p className="text-xs font-medium text-white">Escalate to Admin</p>
                <p className="text-[10px] text-zinc-500">If unacknowledged after 15 minutes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-zinc-500 mb-2">Want to automate shifts?</p>
            <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
              Connect Google Calendar
            </Button>
        </div>
      </div>
    </div>
  );
}
