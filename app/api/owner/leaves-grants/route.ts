import { NextResponse } from "next/server";
import { getUserById } from "@/modules/core/mock-data";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { recordOwnerLeavesGrant } from "@/modules/core/services/leaves-grant-service";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    amountCredits?: number;
    note?: string;
  };
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the owner can grant Eden Leaves manually.",
      },
      { status: 403 },
    );
  }

  const userId = body.userId?.trim();
  const amountCredits = Math.round(body.amountCredits ?? 0);

  if (!userId || amountCredits <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select a user and a positive Leaves amount before recording a manual grant.",
      },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();
  let recipient = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });

  if (!recipient) {
    const shadowUser = getUserById(userId);

    if (!shadowUser) {
      return NextResponse.json(
        {
          ok: false,
          error: "The selected user account no longer exists.",
        },
        { status: 404 },
      );
    }

    recipient = await prisma.user.create({
      data: {
        id: shadowUser.id,
        username: shadowUser.username,
        displayName: shadowUser.displayName,
        role:
          shadowUser.role === "owner"
            ? "OWNER"
            : shadowUser.role === "business"
              ? "BUSINESS"
              : "CONSUMER",
        status:
          shadowUser.status === "frozen"
            ? "FROZEN"
            : shadowUser.status === "review"
              ? "REVIEW"
              : "ACTIVE",
        summary: shadowUser.summary,
        edenBalanceCredits: shadowUser.edenBalanceCredits,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });
  }

  const grant = await recordOwnerLeavesGrant({
    userId: recipient.id,
    grantedByUserId: session.user.id,
    amountCredits,
    note:
      body.note?.trim() ||
      `Manual owner grant recorded for ${recipient.displayName}.`,
  });

  return NextResponse.json({
    ok: true,
    grantId: grant.id,
    userId: recipient.id,
    username: recipient.username,
    amountCredits: grant.amountCredits,
    note: grant.note,
  });
}
