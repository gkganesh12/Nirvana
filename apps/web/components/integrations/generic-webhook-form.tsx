'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Code2, ShieldAlert } from 'lucide-react';

interface Mapping {
  title: string;
  message: string;
  severity: string;
  sourceEventId: string;
  environment: string;
  project: string;
}

interface SeverityMap {
  [key: string]: string;
}

interface GenericWebhookFormProps {
  initialMappings?: Mapping;
  initialSeverityMap?: SeverityMap;
  onSave: (mappings: Mapping, severityMap: SeverityMap) => void;
}

export function GenericWebhookForm({ initialMappings, initialSeverityMap, onSave }: GenericWebhookFormProps) {
  const [mappings, setMappings] = useState<Mapping>(initialMappings || {
    title: '$.title',
    message: '$.body.text',
    severity: '$.level',
    sourceEventId: '$.id',
    environment: '$.metadata.env',
    project: '$.metadata.service'
  });

  const [severityRows, setSeverityRows] = useState<{from: string, to: string}[]>(
    Object.entries(initialSeverityMap || { 'critical': 'CRITICAL', 'error': 'HIGH', 'warning': 'MEDIUM' })
    .map(([from, to]) => ({ from, to }))
  );

  const handleSave = () => {
    const sevMap: SeverityMap = {};
    severityRows.forEach(row => {
      if (row.from && row.to) sevMap[row.from] = row.to;
    });
    onSave(mappings, sevMap);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1.5">
            <Code2 className="h-3 w-3" /> Alert Title Path
          </Label>
          <Input 
            value={mappings.title} 
            onChange={e => setMappings({...mappings, title: e.target.value})}
            placeholder="$.title"
            className="font-mono text-sm bg-stone-50"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1.5">
            <Code2 className="h-3 w-3" /> Event ID Path
          </Label>
          <Input 
            value={mappings.sourceEventId} 
            onChange={e => setMappings({...mappings, sourceEventId: e.target.value})}
            placeholder="$.id"
            className="font-mono text-sm bg-stone-50"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label className="text-xs font-bold uppercase text-stone-500 flex items-center gap-1.5">
            <Code2 className="h-3 w-3" /> Message/Description Path
          </Label>
          <Input 
            value={mappings.message} 
            onChange={e => setMappings({...mappings, message: e.target.value})}
            placeholder="$.body.text"
            className="font-mono text-sm bg-stone-50"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-bold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          Severity Mapping
        </Label>
        <div className="space-y-2">
          {severityRows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input 
                value={row.from} 
                onChange={e => {
                  const newRows = [...severityRows];
                  newRows[i].from = e.target.value;
                  setSeverityRows(newRows);
                }}
                placeholder="Source value (e.g. 'critical')"
                className="text-sm border-stone-200"
              />
              <span className="text-stone-400">→</span>
              <select
                value={row.to}
                onChange={e => {
                  const newRows = [...severityRows];
                  newRows[i].to = e.target.value;
                  setSeverityRows(newRows);
                }}
                className="h-10 px-3 flex-1 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSeverityRows(severityRows.filter((_, idx) => idx !== i))}
                className="text-stone-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSeverityRows([...severityRows, {from: '', to: 'HIGH'}])}
            className="w-full border-dashed border-stone-300 text-stone-500 hover:bg-stone-50"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Severity Mapping
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
        <Button variant="ghost" className="text-stone-500">Cancel</Button>
        <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white px-8">
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
