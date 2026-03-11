import { NextResponse } from "next/server";
import {
  ingestEdenBuildSupervisorTaskResult,
  loadEdenBuildSupervisorState,
  prepareEdenBuildSupervisorPacket,
} from "@/modules/core/agents/eden-build-supervisor";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can inspect the build supervisor.",
      },
      { status: 403 },
    );
  }

  const state = await loadEdenBuildSupervisorState();

  return NextResponse.json({
    ok: true,
    state,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can operate the build supervisor.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    taskId?: string;
    resultStatus?: string;
    summary?: string;
    verification?: string[] | string | null;
    blockers?: string[] | string | null;
    humanActions?: string[] | string | null;
  };

  const actor = {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
    status: session.user.status,
    edenBalanceCredits: session.user.edenBalanceCredits,
  };

  if (body.action === "prepare_packet") {
    const result = await prepareEdenBuildSupervisorPacket(actor);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      state: result.state,
      packet: result.packet,
    });
  }

  if (body.action === "ingest_result") {
    const result = await ingestEdenBuildSupervisorTaskResult(actor, {
      taskId: body.taskId ?? "",
      resultStatus: body.resultStatus ?? "",
      summary: body.summary ?? "",
      verification: body.verification,
      blockers: body.blockers,
      humanActions: body.humanActions,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      state: result.state,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Select a valid build-supervisor action.",
    },
    { status: 400 },
  );
}
