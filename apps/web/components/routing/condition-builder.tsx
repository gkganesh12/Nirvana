'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RuleCondition {
  field: string;
  operator: string;
  value: string | string[];
}

interface ConditionGroup {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

interface ConditionBuilderProps {
  conditions: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
}

const FIELDS = [
  { value: 'environment', label: 'Environment' },
  { value: 'severity', label: 'Severity' },
  { value: 'project', label: 'Project' },
  { value: 'source', label: 'Source' },
  { value: 'title', label: 'Title' },
  { value: 'tags.team', label: 'Tag: Team' },
  { value: 'tags.service', label: 'Tag: Service' },
];

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'in', label: 'is one of' },
  { value: 'not_in', label: 'is not one of' },
  { value: 'contains', label: 'contains' },
  { value: 'regex', label: 'matches regex' },
  { value: 'greater_than_or_equals', label: '>= (severity)' },
  { value: 'less_than_or_equals', label: '<= (severity)' },
];

const SEVERITY_OPTIONS = ['info', 'low', 'med', 'high', 'critical'];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const allConditions = conditions.all ?? [];

  const addCondition = () => {
    const newCondition: RuleCondition = {
      field: 'environment',
      operator: 'equals',
      value: '',
    };
    onChange({ ...conditions, all: [...allConditions, newCondition] });
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const updated = allConditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    );
    onChange({ ...conditions, all: updated });
  };

  const removeCondition = (index: number) => {
    const updated = allConditions.filter((_, i) => i !== index);
    onChange({ ...conditions, all: updated });
  };

  const renderValueInput = (condition: RuleCondition, index: number) => {
    const { field, operator } = condition;

    // For severity field with comparison operators
    if (field === 'severity' && ['greater_than_or_equals', 'less_than_or_equals', 'equals'].includes(operator)) {
      return (
        <select
          value={condition.value as string}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          className="flex h-10 w-full rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="" className="bg-white">Select severity...</option>
          {SEVERITY_OPTIONS.map((sev) => (
            <option key={sev} value={sev} className="bg-white">
              {sev.charAt(0).toUpperCase() + sev.slice(1)}
            </option>
          ))}
        </select>
      );
    }

    // For "in" or "not_in" operators, show comma-separated input
    if (['in', 'not_in'].includes(operator)) {
      const arrayValue = Array.isArray(condition.value) ? condition.value : [];
      return (
        <Input
          value={arrayValue.join(', ')}
          onChange={(e) => {
            const values = e.target.value.split(',').map((v) => v.trim()).filter(Boolean);
            updateCondition(index, { value: values });
          }}
          placeholder="value1, value2, value3"
          className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500 focus:border-red-500/50 focus:ring-red-500/20"
        />
      );
    }

    // Default text input
    return (
      <Input
        value={condition.value as string}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
        placeholder="Enter value..."
        className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500 focus:border-red-500/50 focus:ring-red-500/20"
      />
    );
  };

  return (
    <div className="space-y-3">
      {allConditions.length === 0 && (
        <p className="text-sm text-stone-500 italic">No conditions defined. Add one to filter alerts.</p>
      )}

      {allConditions.map((condition, index) => (
        <div key={index} className="flex flex-col sm:flex-row gap-2 items-start">
          {/* Field selector */}
          <select
            value={condition.field}
            onChange={(e) => updateCondition(index, { field: e.target.value })}
            className="flex h-10 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-w-[140px]"
          >
            {FIELDS.map((field) => (
              <option key={field.value} value={field.value} className="bg-white">
                {field.label}
              </option>
            ))}
          </select>

          {/* Operator selector */}
          <select
            value={condition.operator}
            onChange={(e) => updateCondition(index, { operator: e.target.value })}
            className="flex h-10 rounded-md border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-w-[130px]"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value} className="bg-white">
                {op.label}
              </option>
            ))}
          </select>

          {/* Value input */}
          <div className="flex-1 w-full">{renderValueInput(condition, index)}</div>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeCondition(index)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 h-10 w-10 shrink-0"
          >
            ✕
          </Button>
        </div>
      ))}

      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={addCondition}
        className="bg-white/5 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      >
        + Add Condition
      </Button>
    </div>
  );
}
