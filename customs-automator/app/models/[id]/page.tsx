import Link from "next/link";
import { AppNav } from "@/components/customs/AppNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getModel } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getModel(id);
  const metrics = model.accuracy_metrics;

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{model.label}</h1>
            <p className="mt-1 text-sm text-zinc-600">{model.description}</p>
          </div>
          <Button asChild>
            <Link href={`/extract?model=${model.id}`}>Use Model</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Field accuracy" value={`${(metrics.avg_field_accuracy * 100).toFixed(1)}%`} />
          <Metric label="HS accuracy" value={`${(metrics.avg_hs_accuracy * 100).toFixed(1)}%`} />
          <Metric label="Calibration error" value={`${(metrics.avg_confidence_calibration * 100).toFixed(1)}%`} />
          <Metric label="Eval runs" value={String(metrics.test_runs)} />
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {model.document_types.map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {model.languages.map((language) => (
                <Badge key={language} variant="outline">
                  {language}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Server-side Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
              {model.extraction_prompt}
            </pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
