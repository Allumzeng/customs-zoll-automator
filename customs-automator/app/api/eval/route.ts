import { NextRequest, NextResponse } from "next/server";
import { runEval } from "@/lib/eval";
import { addAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await runEval(
      body.model_id,
      body.test_case_id || crypto.randomUUID(),
      body.extraction,
      body.ground_truth
    );

    await addAudit({
      model_id: body.model_id,
      action: "evaluated",
      actor: "system",
      new_value: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed." },
      { status: 400 }
    );
  }
}
