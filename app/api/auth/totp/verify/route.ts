import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import * as OTPAuth from "otpauth";
import { generateCommandToken } from "@/lib/command-tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code || code.length !== 6) {
    return NextResponse.json({ ok: false, error: "6-digit code required" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });

  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ ok: false, error: "TOTP not enabled" }, { status: 400 });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Eden OS",
    label: session.user.username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totpSecret),
  });

  const delta = totp.validate({ token: code, window: 1 });

  if (delta === null) {
    return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpVerifiedAt: new Date() },
  });

  const commandToken = generateCommandToken(session.user.id);

  return NextResponse.json({
    ok: true,
    commandToken,
    expiresIn: 900, // 15 minutes
  });
}
