import { NextRequest, NextResponse } from "next/server";
import { addAudit, approveExtraction, getExtraction, saveExtraction } from "@/lib/store";
import type { CustomsExtraction } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing extraction id." }, { status: 400 });
  const extraction = await getExtraction(id);
  if (!extraction) return NextResponse.json({ error: "Extraction not found." }, { status: 404 });
  return NextResponse.json(extraction);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const extraction = body.extraction as CustomsExtraction;
    if (!body.id || !extraction) {
      return NextResponse.json({ error: "Missing extraction payload." }, { status: 400 });
    }

    const saved = await saveExtraction({
      ...extraction,
      id: body.id,
      status: "reviewing",
      human_corrections: body.human_corrections || extraction.human_corrections || {},
    });

    await addAudit({
      extraction_id: saved.id,
      model_id: saved.model_id,
      action: "field_edited",
      actor: body.actor || "reviewer",
      field_path: body.field_path,
      old_value: body.old_value,
      new_value: body.new_value,
    });

    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save review edits." },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const approved = await approveExtraction(body.id, body.extraction, body.actor || "reviewer");
    return NextResponse.json(approved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not approve extraction." },
      { status: 400 }
    );
  }
}
