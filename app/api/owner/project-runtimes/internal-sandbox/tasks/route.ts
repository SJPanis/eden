import { NextResponse } from "next/server";
import {
  createOwnerInternalSandboxTask,
  loadOwnerInternalSandboxTaskState,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can inspect sandbox runtime tasks.",
      },
      { status: 403 },
    );
  }

  const state = await loadOwnerInternalSandboxTaskState();

  return NextResponse.json({
    ok: true,
    tasks: state.tasks,
    unavailableReason: state.unavailableReason,
    runtimeMissing: state.runtimeMissing,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can create sandbox runtime tasks.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    inputText?: string;
    providerKey?: string | null;
    modelLabel?: string | null;
    requestedActionType?: string | null;
    executionRole?: string | null;
    adapterKey?: string | null;
  };
  const result = await createOwnerInternalSandboxTask(
    {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role,
      status: session.user.status,
      edenBalanceCredits: session.user.edenBalanceCredits,
    },
    {
      title: body.title,
      inputText: body.inputText ?? "",
      providerKey: body.providerKey,
      modelLabel: body.modelLabel,
      requestedActionType: body.requestedActionType,
      executionRole: body.executionRole,
      adapterKey: body.adapterKey,
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
    task: result.task,
  });
}
