import { NextResponse } from "next/server";
import { loadAutonomyModeState } from "@/modules/core/agents/eden-db-action-policy";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      { ok: false, error: "Only the Eden owner can access autonomy mode state." },
      { status: 403 },
    );
  }

  const state = await loadAutonomyModeState();

  return NextResponse.json({ ok: true, state });
}
