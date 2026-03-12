import { NextResponse } from "next/server";
import { executeOwnerInternalSandboxTaskLiveProvider } from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Only the Eden owner can trigger live provider execution for sandbox tasks.",
      },
      { status: 403 },
    );
  }

  const { taskId } = await context.params;
  const result = await executeOwnerInternalSandboxTaskLiveProvider(
    {
      id: session.user.id,
      username: session.user.username,
      displayName: session.user.displayName,
      role: session.user.role,
      status: session.user.status,
      edenBalanceCredits: session.user.edenBalanceCredits,
    },
    {
      taskId,
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
    attempted: result.attempted,
    executed: result.executed,
    blocked: result.blocked,
    message: result.message,
    task: result.task,
  });
}
