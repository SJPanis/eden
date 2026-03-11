import { NextResponse } from "next/server";
import {
  addOwnerProjectRuntimeDeploymentRecord,
  loadOwnerProjectRuntimeDeploymentHistory,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runtimeId: string }> },
) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can inspect runtime deployment history.",
      },
      { status: 403 },
    );
  }

  const { runtimeId } = await context.params;
  const result = await loadOwnerProjectRuntimeDeploymentHistory(runtimeId);

  return NextResponse.json({
    ok: true,
    records: result.records,
    unavailableReason: result.unavailableReason,
    runtimeMissing: result.runtimeMissing,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ runtimeId: string }> },
) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can record runtime deployment history.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventType?: string;
    eventStatus?: string;
    summary?: string;
    detail?: string | null;
  };
  const { runtimeId } = await context.params;
  const result = await addOwnerProjectRuntimeDeploymentRecord(
    {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role,
      status: session.user.status,
      edenBalanceCredits: session.user.edenBalanceCredits,
    },
    {
      runtimeId,
      eventType: body.eventType ?? "",
      eventStatus: body.eventStatus ?? "",
      summary: body.summary ?? "",
      detail: body.detail,
    },
  );

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
    record: result.record,
  });
}
