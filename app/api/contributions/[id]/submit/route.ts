import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") return NextResponse.json({ ok: false }, { status: 401 });
  const { id: requestId } = await params;
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const proposedSystemPrompt = typeof body?.proposedSystemPrompt === "string" ? body.proposedSystemPrompt : null;

  if (!title) return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });

  const prisma = getPrismaClient();
  const request = await prisma.contributionRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "open") {
    return NextResponse.json({ ok: false, error: "Request not found or closed" }, { status: 404 });
  }
  if (request.creatorId === session.user.id) {
    return NextResponse.json({ ok: false, error: "Cannot contribute to your own service" }, { status: 403 });
  }

  const contribution = await prisma.contribution.create({
    data: {
      requestId,
      contributorId: session.user.id,
      serviceId: request.serviceId,
      title,
      description,
      proposedSystemPrompt,
    },
  });

  return NextResponse.json({ ok: true, contribution });
}
