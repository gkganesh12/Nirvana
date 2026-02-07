'use client';

import { Button } from '@/components/ui/button';

interface FilterBarProps {
  filters: {
    status: string[];
    severity: string[];
    environment: string[];
    project: string[];
    search: string;
  };
  options: {
    statuses: string[];
    severities: string[];
    environments: string[];
    projects: string[];
  };
  onFiltersChange: (filters: FilterBarProps['filters']) => void;
  onClear: () => void;
}

export function FilterBar({ filters, options, onFiltersChange, onClear }: FilterBarProps) {
  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleSeverityToggle = (severity: string) => {
    const newSeverities = filters.severity.includes(severity)
      ? filters.severity.filter((s) => s !== severity)
      : [...filters.severity, severity];
    onFiltersChange({ ...filters, severity: newSeverities });
  };

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.severity.length > 0 ||
    filters.environment.length > 0 ||
    filters.project.length > 0 ||
    filters.search.length > 0;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search alerts..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Status Filters */}
      <div>
        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Status</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {options.statuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusToggle(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.status.includes(status)
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                  : 'bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Severity Filters */}
      <div>
        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Severity</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {options.severities.map((severity) => (
            <button
              key={severity}
              onClick={() => handleSeverityToggle(severity)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.severity.includes(severity)
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                  : 'bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClear} className="border-stone-200 text-stone-500 hover:bg-stone-100 hover:text-stone-900">
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
