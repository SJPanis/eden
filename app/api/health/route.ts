import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Railway healthcheck — must always return 200 quickly.
// Detailed checks live at /api/health/deep.
export async function GET() {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
