import { NextResponse } from "next/server";
import { getLoopStatus } from "@/lib/adam-eve-loop";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, ...getLoopStatus() });
}
