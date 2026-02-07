'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TopSource {
  project: string;
  environment: string;
  count: number;
  percentage: number;
}

interface TopSourcesTableProps {
  sources: TopSource[];
}

export function TopSourcesTable({ sources }: TopSourcesTableProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
        <h3 className="mb-4 text-sm font-medium text-stone-500">Top Alert Sources</h3>
        <p className="py-8 text-center text-sm text-stone-500">No alerts in the last 24 hours</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
      <h3 className="mb-4 text-sm font-medium text-stone-500">Top Alert Sources</h3>
      <Table>
        <TableHeader>
          <TableRow className="border-stone-200 hover:bg-transparent">
            <TableHead className="text-stone-500">Project</TableHead>
            <TableHead className="text-stone-500">Environment</TableHead>
            <TableHead className="text-right text-stone-500">Alerts</TableHead>
            <TableHead className="text-right text-stone-500">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source, index) => (
            <TableRow
              key={`${source.project}-${source.environment}-${index}`}
              className="border-stone-200 transition-colors hover:bg-amber-50/60"
            >
              <TableCell className="font-medium text-stone-800">{source.project}</TableCell>
              <TableCell>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-500">
                  {source.environment}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-stone-700">{source.count}</TableCell>
              <TableCell className="text-right text-stone-500">{source.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
