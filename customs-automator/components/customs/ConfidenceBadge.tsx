"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const tone =
    confidence >= 0.9
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : confidence >= 0.7
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <Badge variant="outline" className={cn("font-mono tabular-nums", tone)}>
      {(confidence * 100).toFixed(0)}%
    </Badge>
  );
}
