import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { code?: string }
    | null;

  const code = body?.code?.trim().toUpperCase() || null;

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Enter an invite code." },
      { status: 400 },
    );
  }

  const record = await getPrismaClient().earlyAccessCode.findUnique({
    where: { code },
    select: { id: true, isActive: true, maxUses: true, useCount: true },
  });

  if (!record || !record.isActive || record.useCount >= record.maxUses) {
    return NextResponse.json(
      { ok: false, error: "This code isn't valid or has already been used." },
      { status: 403 },
    );
  }

  // Validation only — code use count is incremented by /api/auth/sign-up
  return NextResponse.json({ ok: true, code });
}
