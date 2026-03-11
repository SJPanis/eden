import { NextResponse } from "next/server";
import { updateOwnerProjectRuntimeConfigPolicy } from "@/modules/core/services";
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
        error: "Only the Eden owner can manage runtime config boundaries.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    configScope?: string;
    executionMode?: string;
    providerPolicyMode?: string;
    allowedProviders?: string[];
    defaultProvider?: string | null;
    maxTaskBudgetLeaves?: number | string | null;
    monthlyBudgetLeaves?: number | string | null;
    modelPolicySummary?: string | null;
    secretPolicyReference?: string | null;
    notes?: string | null;
    ownerOnlyEnforced?: boolean | null;
    internalOnlyEnforced?: boolean | null;
  };
  const { runtimeId } = await context.params;
  const result = await updateOwnerProjectRuntimeConfigPolicy(
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
      configScope: body.configScope ?? "",
      executionMode: body.executionMode ?? "",
      providerPolicyMode: body.providerPolicyMode ?? "",
      allowedProviders: Array.isArray(body.allowedProviders)
        ? body.allowedProviders
        : [],
      defaultProvider: body.defaultProvider,
      maxTaskBudgetLeaves: body.maxTaskBudgetLeaves,
      monthlyBudgetLeaves: body.monthlyBudgetLeaves,
      modelPolicySummary: body.modelPolicySummary,
      secretPolicyReference: body.secretPolicyReference,
      notes: body.notes,
      ownerOnlyEnforced: body.ownerOnlyEnforced,
      internalOnlyEnforced: body.internalOnlyEnforced,
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
