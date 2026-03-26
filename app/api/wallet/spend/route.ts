import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? body.amount : null;
  const description =
    typeof body?.description === "string" ? body.description : "Service run";

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid amount" },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, edenBalanceCredits: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 },
    );
  }

  if (user.edenBalanceCredits < amount) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Leaf balance",
        balance: user.edenBalanceCredits,
        required: amount,
      },
      { status: 402 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { edenBalanceCredits: { decrement: amount } },
    select: { edenBalanceCredits: true },
  });

  return NextResponse.json({
    ok: true,
    spent: amount,
    description,
    newBalance: updated.edenBalanceCredits,
  });
}
