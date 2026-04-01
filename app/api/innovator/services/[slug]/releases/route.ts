import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { slug } = await params;
  const prisma = getPrismaClient();
  const service = await prisma.edenService.findUnique({
    where: { slug },
    include: { releases: { orderBy: { createdAt: "desc" } } },
  });
  if (!service || service.creatorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, service: { slug: service.slug, name: service.name }, releases: service.releases });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const version = typeof body?.version === "string" ? body.version.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const deploy = body?.deploy === "production" ? "live" : "staged";
  const systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt : null;
  const outputFormat = typeof body?.outputFormat === "string" ? body.outputFormat : "text";

  if (!version) return NextResponse.json({ ok: false, error: "Version required" }, { status: 400 });

  const prisma = getPrismaClient();
  const service = await prisma.edenService.findUnique({ where: { slug } });
  if (!service || service.creatorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
  }

  // If deploying to production, archive the current live release
  if (deploy === "live") {
    await prisma.serviceRelease.updateMany({
      where: { serviceId: service.id, status: "live" },
      data: { status: "archived" },
    });
    // Update the service's system prompt to this release
    if (systemPrompt) {
      await prisma.edenService.update({
        where: { id: service.id },
        data: { systemPrompt, outputFormat },
      });
    }
  }

  const release = await prisma.serviceRelease.create({
    data: {
      serviceId: service.id,
      version,
      notes,
      status: deploy,
      systemPrompt,
      outputFormat,
    },
  });

  return NextResponse.json({ ok: true, release });
}
