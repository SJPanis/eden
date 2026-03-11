import { NextResponse } from "next/server";
import { updateOwnerProjectRuntimeLifecycle } from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ runtimeId: string }> },
) {
  const session = await getServerSession();

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only the Eden owner can manage runtime lifecycle metadata.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    statusDetail?: string | null;
    healthCheckAction?: string | null;
  };
  const { runtimeId } = await context.params;
  const result = await updateOwnerProjectRuntimeLifecycle(
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
      status: body.status ?? "",
      statusDetail: body.statusDetail,
      healthCheckAction: body.healthCheckAction,
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
    changed: result.changed,
    runtime: result.runtime,
  });
}
