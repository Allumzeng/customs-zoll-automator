import type { EvalResult } from "@/lib/eval";

export function DiffView({ result }: { result?: EvalResult }) {
  if (!result) return null;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Field accuracy" value={result.field_accuracy} />
        <Metric label="HS accuracy" value={result.hs_accuracy} />
        <Metric label="Calibration error" value={result.confidence_calibration} />
      </div>
      <div className="space-y-2">
        {result.errors.map((error) => (
          <div key={error.field} className="rounded-md border border-red-100 bg-red-50 p-2 text-xs">
            <div className="font-medium text-red-800">{error.field}</div>
            <div className="text-red-700">Expected: {error.expected}</div>
            <div className="text-red-700">Got: {error.got}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold">{(value * 100).toFixed(1)}%</div>
    </div>
  );
}
