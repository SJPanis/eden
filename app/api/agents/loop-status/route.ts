import { NextResponse } from "next/server";
import { getLoopStatus } from "@/lib/artist-architect-loop";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, ...getLoopStatus() });
}
