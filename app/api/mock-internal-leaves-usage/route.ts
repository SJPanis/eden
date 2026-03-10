import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMockCreatedBusiness } from "@/modules/core/business/server";
import { getMockWorkspaceServices } from "@/modules/core/business/workspace-services-server";
import { getSimulatedTransactions } from "@/modules/core/credits/server";
import { getUserById } from "@/modules/core/mock-data";
import { getMockPipelineRecords } from "@/modules/core/pipeline/server";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";
import {
  buildBusinessPayoutAccountingSummary,
  loadBusinessServiceUsageMetrics,
  recordInternalLeavesUsage,
} from "@/modules/core/services";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    businessId?: string;
    amountCredits?: number;
    reference?: string;
    notes?: string;
  };
  const businessId = requestBody.businessId?.trim();
  const amountCredits = Math.round(requestBody.amountCredits ?? 0);

  if (!businessId || amountCredits <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "A business id and positive internal Leaves amount are required.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);

  if (session.role === "consumer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only builders can use earned Leaves internally.",
      },
      { status: 403 },
    );
  }

  const [createdBusiness, workspaceServices, simulatedTransactions, pipelineRecords] =
    await Promise.all([
      getMockCreatedBusiness(),
      getMockWorkspaceServices(),
      getSimulatedTransactions(),
      getMockPipelineRecords(),
    ]);
  const currentUser = getUserById(session.user.id);
  const isCreatedBusinessOwner =
    createdBusiness?.business.id === businessId &&
    createdBusiness.business.ownerUserId === session.user.id;
  const isOwnedBusinessMember = currentUser?.businessIds.includes(businessId) ?? false;

  if (session.role !== "owner" && !isCreatedBusinessOwner && !isOwnedBusinessMember) {
    return NextResponse.json(
      {
        ok: false,
        error: "This business is outside the current builder scope.",
      },
      { status: 403 },
    );
  }

  const usageMetrics = await loadBusinessServiceUsageMetrics(businessId, {
    simulatedTransactions,
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });
  const payoutAccounting = await buildBusinessPayoutAccountingSummary(usageMetrics, {
    createdBusiness,
    workspaceServices,
  });
  const previousAvailableCredits = payoutAccounting.availableForInternalUseCredits;

  if (previousAvailableCredits < amountCredits) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient earned Leaves for internal Eden use.",
        insufficientBalance: true,
        amountCredits,
        previousAvailableCredits,
        nextAvailableCredits: previousAvailableCredits,
      },
      { status: 409 },
    );
  }

  const result = await recordInternalLeavesUsage({
    businessId,
    userId: session.user.id,
    amountCredits,
    usageType: "internal_eden_use",
    reference: requestBody.reference ?? `internal-use-${businessId}`,
    notes:
      requestBody.notes ??
      `Internal Eden usage recorded for ${session.user.displayName} on ${businessId}.`,
  });

  if (!result.recorded || !result.usage) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to record the internal earned Leaves usage.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    usageId: result.usage.id,
    amountCredits: result.usage.amountCredits,
    usageType: result.usage.usageType,
    previousAvailableCredits,
    nextAvailableCredits: Math.max(previousAvailableCredits - result.usage.amountCredits, 0),
    reference: result.usage.reference ?? null,
  });
}
