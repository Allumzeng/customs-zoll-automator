import { NextRequest, NextResponse } from "next/server";
import { addAudit, getExtraction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing extraction id." }, { status: 400 });

  const extraction = await getExtraction(id);
  if (!extraction) return NextResponse.json({ error: "Extraction not found." }, { status: 404 });
  if (extraction.status !== "approved" && extraction.status !== "exported") {
    return NextResponse.json({ error: "Review approval is required before export." }, { status: 403 });
  }

  await addAudit({
    extraction_id: id,
    model_id: extraction.model_id,
    action: "exported",
    actor: "reviewer",
  });

  return new NextResponse(JSON.stringify(extraction, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="customs-extraction-${id}.json"`,
    },
  });
}
