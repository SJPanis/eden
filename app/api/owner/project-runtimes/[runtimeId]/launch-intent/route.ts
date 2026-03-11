import { NextResponse } from "next/server";
import { updateOwnerProjectRuntimeLaunchIntent } from "@/modules/core/services";
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
        error: "Only the Eden owner can manage runtime launch intent.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    intentType?: string;
    intendedTarget?: string;
    launchMode?: string;
    destinationLabel?: string | null;
    notes?: string | null;
  };
  const { runtimeId } = await context.params;
  const result = await updateOwnerProjectRuntimeLaunchIntent(
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
      intentType: body.intentType ?? "",
      intendedTarget: body.intendedTarget ?? "",
      launchMode: body.launchMode ?? "",
      destinationLabel: body.destinationLabel,
      notes: body.notes,
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
