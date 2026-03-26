import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { rateLimit } from "@/modules/core/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, "validate-invite", 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code =
    typeof body?.code === "string" ? body.code.trim().toUpperCase() : null;

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Code is required." },
      { status: 400 },
    );
  }

  const record = await getPrismaClient().earlyAccessCode.findUnique({
    where: { code },
    select: { isActive: true, maxUses: true, useCount: true, label: true },
  });

  if (!record || !record.isActive || record.useCount >= record.maxUses) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired code." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true, label: record.label });
}
