import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const user = await getPrismaClient().user.findUnique({
    where: { id: session.user.id },
    select: { edenBalanceCredits: true },
  });

  return NextResponse.json({
    ok: true,
    balance: user?.edenBalanceCredits ?? 0,
  });
}
