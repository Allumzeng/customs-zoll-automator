'use client';

interface ConfidenceBadgeProps {
  confidence: number;
  showPercent?: boolean;
}

export function ConfidenceBadge({ confidence, showPercent = true }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const colorClass =
    confidence >= 0.9
      ? 'bg-green-100 text-green-700 border-green-200'
      : confidence >= 0.7
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-red-100 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border ${colorClass}`}>
      {showPercent ? `${pct}%` : confidence >= 0.9 ? 'High' : confidence >= 0.7 ? 'Medium' : 'Low'}
    </span>
  );
}
