import { NextResponse } from "next/server";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/prompts";
import { getModel } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const model = await getModel("default-customs-model");
  return NextResponse.json({
    model,
    extraction_prompt: EXTRACTION_SYSTEM_PROMPT,
  });
}
