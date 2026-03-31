import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const leafCost = typeof body?.leafCost === "number" ? body.leafCost : 5;

  if (!slug || !SLUG_PATTERN.test(slug) || slug.length > 50) {
    return NextResponse.json(
      { ok: false, error: "Slug must be lowercase alphanumeric with dashes, max 50 chars" },
      { status: 400 },
    );
  }

  if (!name || name.length > 100) {
    return NextResponse.json({ ok: false, error: "Name required, max 100 chars" }, { status: 400 });
  }

  if (leafCost < 1 || leafCost > 100) {
    return NextResponse.json({ ok: false, error: "leafCost must be 1-100" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  const existing = await prisma.edenService.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Service slug already taken" }, { status: 409 });
  }

  const service = await prisma.edenService.create({
    data: {
      slug,
      name,
      description,
      leafCost,
      creatorId: session.user.id,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      leafCost: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, service });
}
