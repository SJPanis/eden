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
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, username: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found." },
      { status: 404 },
    );
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: {
      id: true,
      depth: true,
      commissionRate: true,
      totalEarned: true,
      createdAt: true,
      referred: { select: { displayName: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalReferred = referrals.length;
  const totalEarned = referrals.reduce((sum, r) => sum + r.totalEarned, 0);
  const referralCode = user.referralCode ?? user.username;
  const referralLink = `https://edencloud.app/join?ref=${referralCode}`;

  return NextResponse.json({
    ok: true,
    referralCode,
    referralLink,
    totalReferred,
    totalEarned,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.referred.displayName,
      username: r.referred.username,
      depth: r.depth,
      commissionRate: r.commissionRate,
      totalEarned: r.totalEarned,
      createdAt: r.createdAt,
    })),
  });
}
