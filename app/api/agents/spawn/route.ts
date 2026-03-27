import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    agent: {
      id: Date.now(),
      type: "worker",
      status: "spawned",
    },
  });
}
