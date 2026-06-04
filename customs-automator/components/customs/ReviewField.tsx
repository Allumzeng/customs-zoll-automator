"use client";

import type { FieldValue } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface ReviewFieldProps {
  label: string;
  fieldPath: string;
  value: FieldValue<unknown>;
  onEdit: (path: string, newValue: string) => void;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ReviewField({ label, fieldPath, value, onEdit }: ReviewFieldProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3",
        value.flagged ? "border-red-200 bg-red-50/60" : "border-zinc-200"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <Label className="text-xs font-medium uppercase text-zinc-500">{label}</Label>
        <ConfidenceBadge confidence={value.confidence} />
      </div>
      <Input
        defaultValue={displayValue(value.value)}
        onChange={(event) => onEdit(fieldPath, event.target.value)}
        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
      {value.source_text ? (
        <p className="mt-1 truncate text-xs text-zinc-500" title={value.source_text}>
          Source: {value.source_text}
        </p>
      ) : null}
      {value.flagged ? <p className="mt-1 text-xs font-medium text-red-700">Needs human verification</p> : null}
    </div>
  );
}
