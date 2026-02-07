'use client';

import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'same';
  trendPercent?: number;
  suffix?: string;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  trendPercent,
  suffix,
  description,
  className,
}: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend || trend === 'same') return 'text-stone-500';
    // For some metrics, up is bad (alerts), for others up is good (ack rate)
    return trend === 'up' ? 'text-emerald-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'same') return '→';
    return trend === 'up' ? '↑' : '↓';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-scan" />
      </div>
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-stone-900">{value}</span>
            {suffix && <span className="text-sm text-stone-500">{suffix}</span>}
          </div>
          {description && (
            <p className="mt-1 text-xs text-stone-500">{description}</p>
          )}
        </div>
        
        {trend && trendPercent !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
            <span>{getTrendIcon()}</span>
            <span>{trendPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
