import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = new Set(["Finance", "Automotive", "Music", "Productivity", "Creative", "Health", "Education", "Other"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase().slice(0, 50) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 120) : "";
  const category = typeof body?.category === "string" && CATEGORIES.has(body.category) ? body.category : "Other";
  const leafCost = typeof body?.leafCost === "number" ? Math.max(1, Math.min(10000, body.leafCost)) : 5;
  const pricingModel = typeof body?.pricingModel === "string" ? body.pricingModel : "per_use";
  const serviceType = typeof body?.serviceType === "string" ? body.serviceType : "claude";
  const systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt.slice(0, 5000) : null;
  const inputSchema = typeof body?.inputSchema === "string" ? body.inputSchema : null;
  const outputFormat = typeof body?.outputFormat === "string" ? body.outputFormat : "text";
  const externalUrl = typeof body?.externalUrl === "string" ? body.externalUrl : null;
  const thumbnailColor = typeof body?.thumbnailColor === "string" ? body.thumbnailColor : "#2dd4bf";
  const visibility = typeof body?.visibility === "string" ? body.visibility : "public";
  const publish = body?.publish === true;

  if (!name) return NextResponse.json({ ok: false, error: "Service name required" }, { status: 400 });
  if (!slug || !SLUG_PATTERN.test(slug)) return NextResponse.json({ ok: false, error: "Valid slug required (lowercase, dashes)" }, { status: 400 });

  const prisma = getPrismaClient();

  const existing = await prisma.edenService.findUnique({ where: { slug } });
  if (existing && existing.creatorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Slug already taken" }, { status: 409 });
  }

  const data = {
    slug,
    name,
    description,
    category,
    leafCost,
    pricingModel,
    serviceType,
    systemPrompt,
    inputSchema,
    outputFormat,
    externalUrl,
    thumbnailColor,
    visibility,
    status: publish ? "published" : "draft",
    isActive: publish,
    creatorId: session.user.id,
  };

  const service = existing
    ? await prisma.edenService.update({ where: { slug }, data })
    : await prisma.edenService.create({ data });

  return NextResponse.json({ ok: true, service: { id: service.id, slug: service.slug, status: service.status } });
}
