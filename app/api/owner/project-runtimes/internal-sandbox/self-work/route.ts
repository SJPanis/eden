import { NextResponse } from "next/server";
import {
  loadEdenSelfWorkState,
  queueNextApprovedEdenSelfWorkTask,
  queueAndExecuteNextApprovedEdenSelfWorkTask,
} from "@/modules/core/agents/eden-self-work-loop";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can inspect Eden self-work controls.",
      },
      { status: 403 },
    );
  }

  const state = await loadEdenSelfWorkState();

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
        error: "Only the Eden owner can queue Eden self-work tasks.",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  const actor = {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
    status: session.user.status,
    edenBalanceCredits: session.user.edenBalanceCredits,
  };

  // mode=queue_and_execute: queue + auto-execute if autonomy policy allows.
  // Default (no mode): queue only — stops for owner review.
  if (mode === "queue_and_execute") {
    const result = await queueAndExecuteNextApprovedEdenSelfWorkTask(actor);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      queueItem: result.queueItem,
      task: result.task,
      queued: result.queued,
      executed: result.executed,
      autoExecutionSkipped: result.autoExecutionSkipped,
      stopReason: result.stopReason,
    });
  }

  const result = await queueNextApprovedEdenSelfWorkTask(actor);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    queueItem: result.queueItem,
    task: result.task,
  });
}
