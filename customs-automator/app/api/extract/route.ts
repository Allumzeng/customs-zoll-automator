import { NextRequest, NextResponse } from "next/server";
import { extractDocuments } from "@/lib/extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const modelId = String(formData.get("model_id") || "default-customs-model");
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    const extraction = await extractDocuments(modelId, files);

    return NextResponse.json({
      extraction_id: extraction.id,
      overall_confidence: extraction.overall_confidence,
      requires_review: extraction.requires_review,
      redirect: `/review/${extraction.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed." },
      { status: 400 }
    );
  }
}
