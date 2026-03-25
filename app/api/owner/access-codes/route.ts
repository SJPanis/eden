import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDEN-${segment()}-${segment()}`;
}

export async function GET() {
  const session = await getServerSession();
  if (session.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner only." }, { status: 403 });
  }

  const codes = await getPrismaClient().earlyAccessCode.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      label: true,
      maxUses: true,
      useCount: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, codes });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (session.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner only." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    label?: string;
    maxUses?: number;
  } | null;

  const label = body?.label?.trim() || null;
  const maxUses = Math.max(1, Math.min(1000, Math.round(body?.maxUses ?? 1)));

  // Generate a unique code with collision retry
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await getPrismaClient().earlyAccessCode.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const record = await getPrismaClient().earlyAccessCode.create({
    data: { code, label, maxUses },
    select: { id: true, code: true, label: true, maxUses: true, useCount: true, isActive: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, code: record });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (session.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner only." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    isActive?: boolean;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "Missing code id." }, { status: 400 });
  }

  const updated = await getPrismaClient().earlyAccessCode.update({
    where: { id: body.id },
    data: { isActive: body.isActive },
    select: { id: true, code: true, label: true, maxUses: true, useCount: true, isActive: true },
  });

  return NextResponse.json({ ok: true, code: updated });
}
