import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const prisma = getPrismaClient();

  try {
    const records = await prisma.payoutRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        leafsAmount: true,
        cashAmountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ ok: true, records });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error(`[eden][payouts][history] ${detail}`);

    return NextResponse.json(
      { ok: false, error: "Unable to fetch payout history." },
      { status: 500 },
    );
  }
}
