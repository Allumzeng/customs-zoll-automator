import { NextRequest, NextResponse } from "next/server";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { getModel, listModels, saveModel } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const model = await getModel(id);
    const { extraction_prompt: _prompt, ...safeModel } = model;
    return NextResponse.json(safeModel);
  }

  const models = await listModels();
  return NextResponse.json(
    models.map(({ extraction_prompt: _prompt, ...model }) => model)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = await saveModel({
      name: body.name,
      label: body.label,
      description: body.description,
      document_types: body.document_types,
      languages: body.languages,
      extraction_prompt: body.extraction_prompt || EXTRACTION_SYSTEM_PROMPT,
    });
    const { extraction_prompt: _prompt, ...safeModel } = model;
    return NextResponse.json(safeModel, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save model." },
      { status: 400 }
    );
  }
}
