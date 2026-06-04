'use client';

import Link from 'next/link';
import type { Model } from '@/lib/schema';

interface ModelCardProps {
  model: Omit<Model, 'extraction_prompt'>;
}

export function ModelCard({ model }: ModelCardProps) {
  const accuracy = model.accuracy_metrics?.avg_field_accuracy ?? 0;
  const hsAccuracy = model.accuracy_metrics?.avg_hs_accuracy ?? 0;
  const runs = model.accuracy_metrics?.test_runs ?? 0;

  return (
    <Link href={`/models/${model.id}`} className="block">
      <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-gray-900">{model.label || model.name}</h3>
            {model.description && (
              <p className="text-sm text-gray-500 mt-0.5">{model.description}</p>
            )}
          </div>
          <span className="text-xs text-gray-400 font-mono">v{model.version}</span>
        </div>

        <div className="flex gap-4 mt-3 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">Field acc.</span>{' '}
            <span className={accuracy >= 0.95 ? 'text-green-600 font-medium' : accuracy >= 0.80 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
              {runs > 0 ? `${(accuracy * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">HS acc.</span>{' '}
            <span className={hsAccuracy >= 0.85 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
              {runs > 0 ? `${(hsAccuracy * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Eval runs</span>{' '}
            <span>{runs}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {(model.document_types ?? []).map((dt) => (
            <span key={dt} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
              {dt}
            </span>
          ))}
          {(model.languages ?? []).map((lang) => (
            <span key={lang} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded-full uppercase">
              {lang}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
