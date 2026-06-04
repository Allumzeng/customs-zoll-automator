'use client';

import type { CustomsExtraction } from '@/lib/schema';
import { ConfidenceBadge } from './ConfidenceBadge';

interface DiffViewProps {
  extracted: Partial<CustomsExtraction>;
  groundTruth: Partial<CustomsExtraction>;
}

const HEADER_FIELDS: Array<keyof CustomsExtraction> = [
  'invoice_number', 'invoice_date', 'incoterms', 'currency',
  'total_invoice_value', 'country_of_origin', 'country_of_destination',
  'transport_mode', 'gross_weight_kg', 'net_weight_kg',
  'package_count', 'package_type',
];

export function DiffView({ extracted, groundTruth }: DiffViewProps) {
  const rows = HEADER_FIELDS.map((field) => {
    const ext = extracted[field] as { value: unknown; confidence: number } | undefined;
    const gt = groundTruth[field] as { value: unknown } | undefined;
    const extVal = String(ext?.value ?? '').trim();
    const gtVal = String(gt?.value ?? '').trim();
    const match = extVal === gtVal;
    return { field, extVal, gtVal, confidence: ext?.confidence ?? 0, match };
  }).filter((r) => r.extVal || r.gtVal);

  const correct = rows.filter((r) => r.match).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Field accuracy:</span>
        <span className={`font-semibold ${correct / rows.length >= 0.95 ? 'text-green-600' : 'text-amber-600'}`}>
          {rows.length > 0 ? `${((correct / rows.length) * 100).toFixed(1)}%` : '—'}
        </span>
        <span className="text-gray-400">({correct}/{rows.length} fields)</span>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left w-40">Field</th>
              <th className="px-3 py-2 text-left">Extracted</th>
              <th className="px-3 py-2 text-left">Ground Truth</th>
              <th className="px-3 py-2 text-center w-20">Conf.</th>
              <th className="px-3 py-2 text-center w-16">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.field} className={row.match ? '' : 'bg-red-50/50'}>
                <td className="px-3 py-2 text-gray-500 font-mono text-xs">{row.field}</td>
                <td className="px-3 py-2">{row.extVal || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-green-700">{row.gtVal || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-center">
                  <ConfidenceBadge confidence={row.confidence} />
                </td>
                <td className="px-3 py-2 text-center">
                  {row.match ? '✓' : <span className="text-red-500 font-bold">✗</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
