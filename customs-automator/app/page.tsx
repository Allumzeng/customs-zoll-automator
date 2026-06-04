import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Database, FileCheck2, ShieldCheck } from "lucide-react";
import { AppNav } from "@/components/customs/AppNav";
import { ModelCard } from "@/components/customs/ModelCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isUsingSupabase, listExtractions, listModels } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [models, recentExtractions] = await Promise.all([listModels(), listExtractions(6)]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <AppNav />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border bg-white p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-zinc-950">Customs Document Automator</h1>
                <p className="mt-1 text-sm text-zinc-600">
                  Tri-lingual ZH/EN/DE extraction, HS code suggestion, confidence scoring, and mandatory human review.
                </p>
              </div>
              <Button asChild>
                <Link href="/extract">
                  Start Extraction
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={<FileCheck2 />} label="Human gate" value="Required" />
              <Metric icon={<ShieldCheck />} label="Audit log" value="GoBD-ready" />
              <Metric icon={<Database />} label="Storage" value={isUsingSupabase() ? "Supabase" : "Local demo"} />
            </div>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Production Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-600">
              <ChecklistItem done label="Review required before export" />
              <ChecklistItem done label="Low confidence fields flagged" />
              <ChecklistItem done label="CSV and JSON export guarded" />
              <ChecklistItem done={isUsingSupabase()} label="Supabase env configured" />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Extraction Models</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/models/new">New Model</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Extractions</h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            {recentExtractions.length ? (
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExtractions.map((extraction) => (
                    <tr key={extraction.id}>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{extraction.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{extraction.status}</Badge>
                      </td>
                      <td className="px-4 py-3 uppercase">{asText(extraction.language_detected)}</td>
                      <td className="px-4 py-3">{(Array.isArray(extraction.document_types) ? extraction.document_types : []).join(", ")}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {(extraction.overall_confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/review/${extraction.id}`}>Review</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-zinc-500">No extractions yet. Upload a document set to begin.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Defensive: some scalar fields may arrive wrapped as a FieldValue object
// {value, confidence, ...} if the model didn't honor the schema. Render the scalar.
function asText(value: unknown): string {
  if (value && typeof value === "object" && "value" in (value as object)) {
    return String((value as { value: unknown }).value ?? "");
  }
  return value == null ? "" : String(value);
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-zinc-50 p-3">
      <div className="mb-2 text-teal-700 [&_svg]:size-4">{icon}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <Badge className={done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}>
        {done ? "Ready" : "Pending"}
      </Badge>
    </div>
  );
}
