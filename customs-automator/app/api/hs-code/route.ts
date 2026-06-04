import { NextRequest, NextResponse } from "next/server";
import { suggestHsCode } from "@/lib/hs-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const suggestion = await suggestHsCode(String(body.description || ""));
    return NextResponse.json(suggestion);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "HS code suggestion failed." },
      { status: 400 }
    );
  }
}
