'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import type { LineItem } from '@/lib/schema';

interface ReviewTableProps {
  items: LineItem[];
  onEdit: (path: string, newValue: string) => void;
  disabled?: boolean;
}

export function ReviewTable({ items, onEdit, disabled = false }: ReviewTableProps) {
  if (!items?.length) return <p className="text-sm text-gray-400">No line items extracted.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-left">HS Code</th>
            <th className="px-3 py-2 text-left">Qty</th>
            <th className="px-3 py-2 text-left">Unit</th>
            <th className="px-3 py-2 text-right">Unit Price</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-left">CCY</th>
            <th className="px-3 py-2 text-left">Origin</th>
            <th className="px-3 py-2 text-right">Net KG</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.line_number} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{item.line_number}</td>
              <EditableCell
                value={item.description?.value ?? ''}
                confidence={item.description?.confidence ?? 0}
                flagged={item.description?.flagged ?? false}
                path={`items[${item.line_number - 1}].description.value`}
                onEdit={onEdit}
                disabled={disabled}
              />
              <td className="px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <EditableCell
                    value={item.hs_code_suggested?.value ?? ''}
                    confidence={item.hs_code_suggested?.confidence ?? 0}
                    flagged={item.hs_code_suggested?.flagged ?? false}
                    path={`items[${item.line_number - 1}].hs_code_suggested.value`}
                    onEdit={onEdit}
                    disabled={disabled}
                  />
                  {item.hs_code_reasoning && (
                    <span className="text-xs text-gray-400 italic" title={item.hs_code_reasoning}>
                      {item.hs_code_reasoning.slice(0, 60)}…
                    </span>
                  )}
                </div>
              </td>
              <EditableCell
                value={String(item.quantity?.value ?? '')}
                confidence={item.quantity?.confidence ?? 0}
                flagged={item.quantity?.flagged ?? false}
                path={`items[${item.line_number - 1}].quantity.value`}
                onEdit={onEdit}
                disabled={disabled}
              />
              <EditableCell
                value={item.unit?.value ?? ''}
                confidence={item.unit?.confidence ?? 0}
                flagged={item.unit?.flagged ?? false}
                path={`items[${item.line_number - 1}].unit.value`}
                onEdit={onEdit}
                disabled={disabled}
              />
              <EditableCell
                value={String(item.unit_price?.value ?? '')}
                confidence={item.unit_price?.confidence ?? 0}
                flagged={item.unit_price?.flagged ?? false}
                path={`items[${item.line_number - 1}].unit_price.value`}
                onEdit={onEdit}
                align="right"
                disabled={disabled}
              />
              <EditableCell
                value={String(item.total_value?.value ?? '')}
                confidence={item.total_value?.confidence ?? 0}
                flagged={item.total_value?.flagged ?? false}
                path={`items[${item.line_number - 1}].total_value.value`}
                onEdit={onEdit}
                align="right"
                disabled={disabled}
              />
              <EditableCell
                value={item.currency?.value ?? ''}
                confidence={item.currency?.confidence ?? 0}
                flagged={item.currency?.flagged ?? false}
                path={`items[${item.line_number - 1}].currency.value`}
                onEdit={onEdit}
                disabled={disabled}
              />
              <EditableCell
                value={item.country_of_origin?.value ?? ''}
                confidence={item.country_of_origin?.confidence ?? 0}
                flagged={item.country_of_origin?.flagged ?? false}
                path={`items[${item.line_number - 1}].country_of_origin.value`}
                onEdit={onEdit}
                disabled={disabled}
              />
              <EditableCell
                value={String(item.weight_net_kg?.value ?? '')}
                confidence={item.weight_net_kg?.confidence ?? 0}
                flagged={item.weight_net_kg?.flagged ?? false}
                path={`items[${item.line_number - 1}].weight_net_kg.value`}
                onEdit={onEdit}
                align="right"
                disabled={disabled}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EditableCellProps {
  value: string;
  confidence: number;
  flagged: boolean;
  path: string;
  onEdit: (path: string, v: string) => void;
  align?: 'left' | 'right';
  disabled?: boolean;
}

function EditableCell({ value, confidence, flagged, path, onEdit, align = 'left', disabled }: EditableCellProps) {
  const cellBg = flagged ? 'bg-red-50' : confidence < 0.7 ? 'bg-amber-50/40' : '';
  return (
    <td className={`px-3 py-2 ${cellBg}`}>
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <input
          defaultValue={value}
          disabled={disabled}
          onChange={(e) => onEdit(path, e.target.value)}
          className={`bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-sm w-full min-w-[60px] ${align === 'right' ? 'text-right' : ''}`}
        />
        {confidence < 0.9 && <ConfidenceBadge confidence={confidence} showPercent={false} />}
      </div>
    </td>
  );
}
