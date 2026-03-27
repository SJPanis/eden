import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export const runtime = "nodejs";

// GET — generate new TOTP secret and QR code
export async function GET() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const secret = new OTPAuth.Secret();
  const totp = new OTPAuth.TOTP({
    issuer: "Eden OS",
    label: session.user.username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const qrCode = await QRCode.toDataURL(totp.toString());

  // Store secret temporarily (not yet enabled)
  const prisma = getPrismaClient();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret.base32 },
  });

  return NextResponse.json({
    ok: true,
    qrCode,
    secret: secret.base32,
  });
}

// POST — verify setup code and enable TOTP
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
    select: { totpSecret: true },
  });

  if (!user?.totpSecret) {
    return NextResponse.json({ ok: false, error: "No TOTP secret found. Start setup first." }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: "Invalid code. Try again." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpEnabled: true,
      totpVerifiedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, message: "TOTP enabled" });
}
