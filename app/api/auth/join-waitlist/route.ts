import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { rateLimit } from "@/modules/core/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 3 waitlist submissions per IP per hour
  const limit = rateLimit(request, "waitlist", 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { email?: string; name?: string; note?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim() || null;
  const note = body?.note?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const existing = await getPrismaClient().waitlistEntry.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: true, alreadyRegistered: true });
  }

  await getPrismaClient().waitlistEntry.create({
    data: { email, name, note },
  });

  return NextResponse.json({ ok: true, alreadyRegistered: false });
}
