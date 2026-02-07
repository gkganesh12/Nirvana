'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

interface Shift {
  userId: string;
  displayName: string | null;
  email: string;
  startsAt: string;
  endsAt: string;
  source: 'rotation' | 'override';
  layerId?: string;
}

interface CalendarViewProps {
  rotationId: string;
  rotationName: string;
}

export function CalendarView({ rotationId, rotationName }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const from = startDate.toISOString();
      const to = endDate.toISOString();
      const res = await fetch(`/api/oncall/rotations/${rotationId}/schedule?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      setShifts(data);
    } catch (err) {
      console.error('Failed to load schedule', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [rotationId, currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getShiftsForDay = (day: Date) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.startsAt);
      const shiftEnd = new Date(shift.endsAt);
      // Check if day is within shift range (inclusive of start, exclusive of end for boundaries)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      
      return (shiftStart <= dayEnd && shiftEnd >= dayStart);
    });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 shadow-lg shadow-stone-900/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-stone-100 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-50 p-2">
            <CalendarIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">{format(currentMonth, 'MMMM yyyy')}</h3>
            <p className="text-xs text-stone-500">{rotationName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 border-stone-200 text-stone-600 hover:bg-stone-50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-8 border-stone-200 text-stone-600 hover:bg-stone-50">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 border-stone-200 text-stone-600 hover:bg-stone-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50 text-center text-[10px] font-bold uppercase tracking-wider text-stone-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-3">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
          </div>
        )}
        
        {calendarDays.map((day, i) => {
          const dayShifts = getShiftsForDay(day);
          const isSelectedMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);

          return (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[120px] border-b border-r border-stone-100 p-2 transition-colors hover:bg-stone-50/30",
                !isSelectedMonth && "bg-stone-50/40 text-stone-400 font-light",
                i % 7 === 6 && "border-r-0"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center text-xs font-semibold",
                  isCurrentDay && "rounded-full bg-red-600 text-white shadow-md shadow-red-600/20",
                  !isCurrentDay && isSelectedMonth && "text-stone-700",
                  !isSelectedMonth && "text-stone-300"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1">
                {dayShifts.map((shift, idx) => (
                  <div 
                    key={`${shift.userId}-${idx}`}
                    className={cn(
                      "group relative cursor-help rounded-md px-2 py-1 text-[10px] font-medium transition-all hover:scale-[1.02] shadow-sm",
                      shift.source === 'override' 
                        ? "bg-amber-100/90 text-amber-800 border border-amber-200"
                        : "bg-blue-50/90 text-blue-700 border border-blue-100",
                      !isSelectedMonth && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        shift.source === 'override' ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      <span className="truncate">{shift.displayName || shift.email.split('@')[0]}</span>
                    </div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-stone-900/95 backdrop-blur-sm p-2 text-[10px] text-white shadow-xl group-hover:block pointer-events-none">
                      <p className="font-bold border-b border-stone-700 pb-1 mb-1">
                        {shift.source === 'override' ? '⚠️ Override' : '🔄 On-Call Shift'}
                      </p>
                      <p className="truncate">{shift.displayName || shift.email}</p>
                      <p className="text-stone-400 mt-1">
                        {format(new Date(shift.startsAt), 'MMM d, h:mm a')} - 
                        {format(new Date(shift.endsAt), 'MMM d, h:mm a')}
                      </p>
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-stone-900/95" />
                    </div>
                  </div>
                ))}
                {dayShifts.length > 4 && (
                  <p className="text-[9px] text-stone-400 font-medium pl-1">
                    + {dayShifts.length - 4} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-100 bg-stone-50/30 p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-50 border border-blue-200" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Regular Shift</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-amber-100 border border-amber-200" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Manual Override</span>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] text-stone-400 italic">
          <Info className="h-3 w-3" />
          Shifts automatically calculate handoffs and timezone restrictions
        </div>
      </div>
    </div>
  );
}
