import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") return NextResponse.json({ ok: false }, { status: 401 });
  const { slug } = await params;
  const prisma = getPrismaClient();
  const service = await prisma.edenService.findUnique({
    where: { slug },
    include: {
      contributionRequests: {
        orderBy: { createdAt: "desc" },
        include: { contributions: { select: { id: true, title: true, status: true, contributorId: true } } },
      },
    },
  });
  if (!service) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, requests: service.contributionRequests });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") return NextResponse.json({ ok: false }, { status: 401 });
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const rewardPercent = typeof body?.rewardPercent === "number" ? Math.max(1, Math.min(20, body.rewardPercent)) : 5;

  if (!title) return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });

  const prisma = getPrismaClient();
  const service = await prisma.edenService.findUnique({ where: { slug } });
  if (!service || service.creatorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "Not your service" }, { status: 403 });
  }

  const request = await prisma.contributionRequest.create({
    data: { serviceId: service.id, creatorId: session.user.id, title, description, rewardPercent },
  });

  await prisma.edenService.update({ where: { slug }, data: { contributionsEnabled: true } });

  return NextResponse.json({ ok: true, request });
}
