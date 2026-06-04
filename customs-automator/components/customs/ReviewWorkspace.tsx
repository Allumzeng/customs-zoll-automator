"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomsExtraction } from "@/lib/schema";
import { DocumentViewer } from "./DocumentViewer";
import { ReviewField } from "./ReviewField";
import { ReviewTable } from "./ReviewTable";

function coerceValue(original: unknown, next: string) {
  if (typeof original === "number") return Number(next);
  if (typeof original === "object" && original !== null) {
    try {
      return JSON.parse(next);
    } catch {
      return original;
    }
  }
  return next;
}

function setPath<T>(input: T, path: string, next: string): T {
  const output = structuredClone(input);
  const parts = path.split(".");
  let cursor: Record<string, unknown> = output as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) {
    cursor = cursor[part] as Record<string, unknown>;
  }
  const leaf = parts.at(-1) as string;
  cursor[leaf] = coerceValue(cursor[leaf], next);
  return output;
}

export function ReviewWorkspace({ initialExtraction }: { initialExtraction: CustomsExtraction }) {
  const [extraction, setExtraction] = useState(initialExtraction);
  const [status, setStatus] = useState<string | null>(null);

  const sourceText = useMemo(
    () =>
      [
        extraction.invoice_number.source_text,
        extraction.exporter.source_text,
        extraction.importer.source_text,
        extraction.items[0]?.description.source_text,
        extraction.items[0]?.hs_code_reasoning,
      ]
        .filter(Boolean)
        .join("\n\n"),
    [extraction]
  );

  function edit(path: string, value: string) {
    setExtraction((current) => ({
      ...setPath(current, path, value),
      human_corrections: { ...current.human_corrections, [path]: value },
    }));
  }

  async function save() {
    setStatus("Saving review edits...");
    const response = await fetch("/api/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: extraction.id,
        extraction,
        human_corrections: extraction.human_corrections,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setExtraction(data);
      setStatus("Review edits saved.");
    } else {
      setStatus(data.error || "Could not save edits.");
    }
  }

  async function approve() {
    setStatus("Approving extraction...");
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: extraction.id, extraction }),
    });
    const data = await response.json();
    if (response.ok) {
      setExtraction(data);
      setStatus("Approved. Exports are unlocked.");
    } else {
      setStatus(data.error || "Could not approve extraction.");
    }
  }

  const exportLocked = extraction.status !== "approved" && extraction.status !== "exported";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
          <div>
            <div className="text-sm text-zinc-500">Overall confidence</div>
            <div className="text-2xl font-semibold tabular-nums">{(extraction.overall_confidence * 100).toFixed(1)}%</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={save}>
              <Save />
              Save
            </Button>
            <Button onClick={approve}>
              <CheckCircle2 />
              Approve
            </Button>
            <Button asChild variant="outline" disabled={exportLocked}>
              <Link href={exportLocked ? "#" : `/api/export/json?id=${extraction.id}`}>
                <Download />
                JSON
              </Link>
            </Button>
            <Button asChild variant="outline" disabled={exportLocked}>
              <Link href={exportLocked ? "#" : `/api/export/csv?id=${extraction.id}`}>
                <Download />
                CSV
              </Link>
            </Button>
          </div>
          {status ? <p className="basis-full text-sm text-zinc-600">{status}</p> : null}
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReviewField label="Invoice no." fieldPath="invoice_number.value" value={extraction.invoice_number} onEdit={edit} />
          <ReviewField label="Invoice date" fieldPath="invoice_date.value" value={extraction.invoice_date} onEdit={edit} />
          <ReviewField label="Exporter" fieldPath="exporter.value" value={extraction.exporter} onEdit={edit} />
          <ReviewField label="Importer" fieldPath="importer.value" value={extraction.importer} onEdit={edit} />
          <ReviewField label="Incoterms" fieldPath="incoterms.value" value={extraction.incoterms} onEdit={edit} />
          <ReviewField label="Currency" fieldPath="currency.value" value={extraction.currency} onEdit={edit} />
          <ReviewField label="Total value" fieldPath="total_invoice_value.value" value={extraction.total_invoice_value} onEdit={edit} />
          <ReviewField label="Origin" fieldPath="country_of_origin.value" value={extraction.country_of_origin} onEdit={edit} />
          <ReviewField label="Destination" fieldPath="country_of_destination.value" value={extraction.country_of_destination} onEdit={edit} />
          <ReviewField label="Transport" fieldPath="transport_mode.value" value={extraction.transport_mode} onEdit={edit} />
          <ReviewField label="Gross kg" fieldPath="gross_weight_kg.value" value={extraction.gross_weight_kg} onEdit={edit} />
          <ReviewField label="Net kg" fieldPath="net_weight_kg.value" value={extraction.net_weight_kg} onEdit={edit} />
          <ReviewField label="Packages" fieldPath="package_count.value" value={extraction.package_count} onEdit={edit} />
          <ReviewField label="Package type" fieldPath="package_type.value" value={extraction.package_type} onEdit={edit} />
          <ReviewField label="Marks" fieldPath="marks_and_numbers.value" value={extraction.marks_and_numbers} onEdit={edit} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Line Items</h2>
          <ReviewTable items={extraction.items} onEdit={edit} />
        </section>
      </main>
      <DocumentViewer sourceText={sourceText} />
    </div>
  );
}
