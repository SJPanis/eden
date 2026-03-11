import { NextResponse } from "next/server";
import { updateOwnerProjectRuntimeProviderApproval } from "@/modules/core/services";
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
        error: "Only the Eden owner can manage runtime provider approvals.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    providerKey?: string;
    approvalStatus?: string;
    modelScope?: string[];
    capabilityScope?: string[];
    notes?: string | null;
  };
  const { runtimeId } = await context.params;
  const result = await updateOwnerProjectRuntimeProviderApproval(
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
      providerKey: body.providerKey ?? "",
      approvalStatus: body.approvalStatus ?? "",
      modelScope: Array.isArray(body.modelScope) ? body.modelScope : [],
      capabilityScope: Array.isArray(body.capabilityScope)
        ? body.capabilityScope
        : [],
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
