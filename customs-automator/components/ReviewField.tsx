'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import type { FieldValue } from '@/lib/schema';

interface ReviewFieldProps {
  label: string;
  fieldPath: string;
  value: FieldValue;
  onEdit: (path: string, newValue: string) => void;
  disabled?: boolean;
}

export function ReviewField({ label, fieldPath, value, onEdit, disabled = false }: ReviewFieldProps) {
  const borderClass = value.flagged
    ? 'border-red-300 bg-red-50'
    : value.confidence < 0.7
      ? 'border-amber-300 bg-amber-50/30'
      : 'border-gray-200 bg-white';

  return (
    <div className={`p-3 rounded-lg border ${borderClass}`}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </label>
        <ConfidenceBadge confidence={value.confidence} />
      </div>
      <input
        defaultValue={value.value ?? ''}
        disabled={disabled}
        onChange={(e) => onEdit(fieldPath, e.target.value)}
        className="w-full text-sm border-0 p-0 focus:ring-0 bg-transparent focus:outline-none"
      />
      {value.source_text && (
        <p className="text-xs text-gray-400 mt-1 truncate" title={value.source_text}>
          Source: {value.source_text}
        </p>
      )}
      {value.flagged && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <span>⚠</span> Low confidence — please verify
        </p>
      )}
    </div>
  );
}
