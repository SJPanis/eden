import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  // Check if email is already taken by another user
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email },
  });

  return NextResponse.json({ ok: true });
}
