import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isBusinessFrozen } from "@/modules/core/admin/mock-admin-state";
import { getMockAdminState } from "@/modules/core/admin/server";
import {
  getMockCreatedBusinessState,
  mockCreatedBusinessCookieName,
  parseMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";
import {
  getMockWorkspaceServiceStates,
  mockWorkspaceServicesCookieName,
  parseMockWorkspaceServicesCookie,
} from "@/modules/core/business/mock-workspace-services";
import {
  getUserCreditsBalance,
  mockTransactionsCookieName,
  serializeMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import type { EdenMockTransaction } from "@/modules/core/mock-data";
import { getWalletTransactionState } from "@/modules/core/credits/server";
import {
  getMockPipelineRecords,
} from "@/modules/core/pipeline/server";
import {
  buildUsageSettlementSnapshot,
  resolveEffectiveUsageChargeLeaves,
} from "@/modules/core/services/service-pricing";
import {
  executeLiveService,
  getLiveServiceExecutionDefinition,
} from "@/modules/core/services/live-service-execution";
import {
  loadBusinessById,
  loadDiscoveryBusinessForService,
  loadDiscoveryServiceById,
  recordServiceUsageEvent,
} from "@/modules/core/services";
import { getServerSession } from "@/modules/core/session/server";

const mockTransactionsCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    serviceId?: string;
    input?: string;
  };
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : null;
  const prompt = typeof body.input === "string" ? body.input.trim() : "";

  if (!serviceId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A service id is required before Eden can run this service.",
      },
      { status: 400 },
    );
  }

  const definition = getLiveServiceExecutionDefinition(serviceId);

  if (!definition) {
    return NextResponse.json(
      {
        ok: false,
        error: "This service is not enabled for live execution yet.",
      },
      { status: 400 },
    );
  }

  if (prompt.length < definition.minimumInputLength) {
    return NextResponse.json(
      {
        ok: false,
        error: `Share at least ${definition.minimumInputLength} characters so Eden can produce a useful result.`,
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const [
    session,
    adminState,
    { cookieTransactions, effectiveTransactions: currentTransactions },
    pipelineRecords,
  ] = await Promise.all([
    getServerSession(),
    getMockAdminState(),
    getWalletTransactionState(),
    getMockPipelineRecords(),
  ]);
  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(
      cookieStore.get(mockCreatedBusinessCookieName)?.value,
    ),
  );
  const workspaceServices = getMockWorkspaceServiceStates(
    parseMockWorkspaceServicesCookie(
      cookieStore.get(mockWorkspaceServicesCookieName)?.value,
    ),
  );
  const service = await loadDiscoveryServiceById(serviceId, {
    pipelineRecords,
    createdBusiness,
    workspaceServices,
  });

  if (!service) {
    return NextResponse.json(
      {
        ok: false,
        error: "This service is not currently published and available for a paid run.",
      },
      { status: 409 },
    );
  }

  const business =
    (await loadDiscoveryBusinessForService(service, {
      pipelineRecords,
      createdBusiness,
      workspaceServices,
    })) ??
    (await loadBusinessById(service.businessId, {
      createdBusiness,
    }));

  if (!business) {
    return NextResponse.json(
      {
        ok: false,
        error: "Eden could not resolve the business for this service.",
      },
      { status: 404 },
    );
  }

  if (isBusinessFrozen(business.id, adminState)) {
    return NextResponse.json(
      {
        ok: false,
        error: "This service is temporarily unavailable because the business is under owner review.",
      },
      { status: 409 },
    );
  }

  const currentBalanceCredits = getUserCreditsBalance(
    session.user.id,
    currentTransactions,
  );
  const requiredCredits = resolveEffectiveUsageChargeLeaves(
    {
      pricePerUse: service.pricePerUse,
      pricingType: service.pricingType,
      pricingUnit: service.pricingUnit,
      pricingModel: service.pricingModel,
    },
    service.pricePerUse ?? 40,
    definition.metering,
  );

  if (currentBalanceCredits < requiredCredits) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Eden Leaves for this live service run.",
        insufficientBalance: true,
        requiredCredits,
        currentBalanceCredits,
        shortfallCredits: requiredCredits - currentBalanceCredits,
      },
      { status: 409 },
    );
  }

  const result = executeLiveService(service.id, prompt);

  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: "Eden could not execute that service.",
      },
      { status: 500 },
    );
  }

  const settlementSnapshot = buildUsageSettlementSnapshot(
    {
      pricePerUse: service.pricePerUse,
      pricingType: service.pricingType,
      pricingUnit: service.pricingUnit,
      pricingModel: service.pricingModel,
    },
    requiredCredits,
    definition.metering,
  );

  const usagePersistence = await recordServiceUsageEvent({
    serviceId: service.id,
    userId: session.user.id,
    usageType: "live_service_execution",
    creditsUsed: requiredCredits,
    grossCredits: settlementSnapshot.grossCredits,
    platformFeeCredits: settlementSnapshot.platformFeeCredits,
    builderEarningsCredits: settlementSnapshot.builderEarningsCredits,
  });

  if (!usagePersistence.recorded) {
    return NextResponse.json(
      {
        ok: false,
        error: "Eden could not record this paid service run. No Leaves were charged.",
      },
      { status: 503 },
    );
  }

  const nextTransaction = {
    id: `live-service-usage-${crypto.randomUUID()}`,
    userId: session.user.id,
    businessId: business.id,
    serviceId: service.id,
    title: `${service.title} run completed`,
    amountLabel: `-${requiredCredits} Leaves`,
    creditsDelta: -requiredCredits,
    direction: "outflow",
    kind: "usage",
    detail: `Live service run completed for ${service.title}. Eden recorded the usage and updated builder/platform accounting.`,
    timestamp: "Just now",
    simulated: false,
  } satisfies EdenMockTransaction;
  const nextCookieTransactions = [nextTransaction, ...cookieTransactions].slice(0, 40);
  const nextTransactions = [nextTransaction, ...currentTransactions].slice(0, 40);
  const nextBalanceCredits = getUserCreditsBalance(session.user.id, nextTransactions);
  const response = NextResponse.json({
    ok: true,
    serviceId: service.id,
    serviceTitle: service.title,
    transactionId: nextTransaction.id,
    transactionTitle: nextTransaction.title,
    transactionTimestamp: nextTransaction.timestamp,
    amountLabel: nextTransaction.amountLabel,
    requiredCredits,
    previousBalanceCredits: currentBalanceCredits,
    nextBalanceCredits,
    grossCredits: settlementSnapshot.grossCredits,
    platformFeeCredits: settlementSnapshot.platformFeeCredits,
    builderEarningsCredits: settlementSnapshot.builderEarningsCredits,
    result,
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie(nextCookieTransactions),
    mockTransactionsCookieOptions,
  );

  return response;
}
