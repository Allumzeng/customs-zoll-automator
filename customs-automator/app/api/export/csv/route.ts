import { NextRequest, NextResponse } from "next/server";
import { addAudit, getExtraction } from "@/lib/store";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing extraction id." }, { status: 400 });

  const extraction = await getExtraction(id);
  if (!extraction) return NextResponse.json({ error: "Extraction not found." }, { status: 404 });
  if (extraction.status !== "approved" && extraction.status !== "exported") {
    return NextResponse.json({ error: "Review approval is required before export." }, { status: 403 });
  }

  const rows = [
    [
      "invoice_number",
      "invoice_date",
      "line_number",
      "description",
      "hs_code",
      "quantity",
      "unit",
      "unit_price",
      "total_value",
      "currency",
      "origin",
      "net_kg",
      "gross_kg",
      "confidence",
    ],
    ...extraction.items.map((item) => [
      extraction.invoice_number.value,
      extraction.invoice_date.value,
      item.line_number,
      item.description.value,
      item.hs_code_suggested.value,
      item.quantity.value,
      item.unit.value,
      item.unit_price.value,
      item.total_value.value,
      item.currency.value,
      item.country_of_origin.value,
      item.weight_net_kg.value,
      item.weight_gross_kg.value,
      item.hs_code_suggested.confidence,
    ]),
  ];

  await addAudit({
    extraction_id: id,
    model_id: extraction.model_id,
    action: "exported",
    actor: "reviewer",
  });

  return new NextResponse(rows.map((row) => row.map(csvEscape).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customs-extraction-${id}.csv"`,
    },
  });
}
