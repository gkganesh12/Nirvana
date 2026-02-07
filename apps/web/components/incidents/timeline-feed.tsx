'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  UserPlus, 
  ExternalLink, 
  GitBranch, 
  ShieldAlert,
  FileText
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  message: string | null;
  source: string | null;
  metadataJson: any;
  occurredAt: string;
}

interface TimelineFeedProps {
  alertGroupId: string;
  initialEntries?: TimelineEntry[];
}

export function TimelineFeed({ alertGroupId, initialEntries = [] }: TimelineFeedProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>(initialEntries);
  const [loading, setLoading] = useState(initialEntries.length === 0);

  useEffect(() => {
    if (initialEntries.length === 0) {
      fetchTimeline();
    }
  }, [alertGroupId]);

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/alert-groups/${alertGroupId}/timeline`);
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch timeline', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT_CREATED': return <Bell className="w-3 h-3 text-red-500" />;
      case 'ALERT_ACKED': return <CheckCircle2 className="w-3 h-3 text-sky-500" />;
      case 'ALERT_RESOLVED': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'COMMENT_ADDED': return <MessageSquare className="w-3 h-3 text-stone-500" />;
      case 'ROLE_ASSIGNED': return <UserPlus className="w-3 h-3 text-amber-500" />;
      case 'JIRA_TICKET_CREATED': return <ExternalLink className="w-3 h-3 text-blue-500" />;
      case 'WAR_ROOM_CREATED': return <ShieldAlert className="w-3 h-3 text-indigo-500" />;
      case 'DEPLOYMENT_CORRELATED': return <GitBranch className="w-3 h-3 text-purple-500" />;
      case 'POST_MORTEM_CREATED': return <FileText className="w-3 h-3 text-emerald-600" />;
      default: return <Clock className="w-3 h-3 text-stone-400" />;
    }
  };

  if (loading) return <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-stone-100 rounded-lg"></div>)}
  </div>;

  return (
    <div className="relative space-y-0 pb-8">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-0 w-px bg-stone-200" />

      {entries.map((entry, index) => (
        <div key={entry.id} className="relative pl-10 pb-6 group">
          {/* Dot */}
          <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-sm z-10 group-hover:border-stone-400 transition-colors">
            {getIcon(entry.type)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-stone-900 leading-none">
                {entry.title}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {new Date(entry.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            {entry.message && (
              <p className="text-xs text-stone-600 leading-relaxed bg-stone-50/50 p-2 rounded border border-stone-100/50">
                {entry.message}
              </p>
            )}

            <div className="flex items-center gap-2">
               <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                 {entry.source || 'SYSTEM'}
               </span>
               <span className="text-[10px] text-stone-300">•</span>
               <span className="text-[10px] text-stone-400">
                 {new Date(entry.occurredAt).toLocaleDateString()}
               </span>
            </div>
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-12 text-stone-400 select-none">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm italic">Timeline records will appear here.</p>
        </div>
      )}
    </div>
  );
}
