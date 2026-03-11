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
  loadRecordedServiceUsageEvent,
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
    executionKey?: string;
  };
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : null;
  const executionKey =
    typeof body.executionKey === "string" && body.executionKey.trim().length > 0
      ? body.executionKey.trim()
      : null;
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

  if (!executionKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Eden needs a stable execution key before it can run a paid service.",
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
  const usageTransactionId = buildLiveExecutionTransactionId(executionKey);
  const existingUsageRecord = await loadRecordedServiceUsageEvent(executionKey);

  if (existingUsageRecord) {
    if (
      existingUsageRecord.serviceId !== service.id ||
      existingUsageRecord.userId !== session.user.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "That paid execution key is already associated with a different Eden service run.",
        },
        { status: 409 },
      );
    }

    const existingResult = executeLiveService(service.id, prompt);

    if (!existingResult) {
      return NextResponse.json(
        {
          ok: false,
          error: "Eden could not restore that paid service result.",
        },
        { status: 500 },
      );
    }

    const transactionState = ensureUsageTransactionRecorded(
      currentTransactions,
      cookieTransactions,
      buildUsageTransaction({
        id: usageTransactionId,
        userId: session.user.id,
        businessId: business.id,
        serviceId: service.id,
        serviceTitle: service.title,
        requiredCredits: existingUsageRecord.creditsUsed,
      }),
      session.user.id,
    );
    const previousBalanceCredits = transactionState.alreadyRecorded
      ? currentBalanceCredits + existingUsageRecord.creditsUsed
      : currentBalanceCredits;
    const response = NextResponse.json({
      ok: true,
      serviceId: service.id,
      serviceTitle: service.title,
      transactionId: usageTransactionId,
      transactionTitle: transactionState.transaction.title,
      transactionTimestamp: transactionState.transaction.timestamp,
      amountLabel: transactionState.transaction.amountLabel,
      requiredCredits: existingUsageRecord.creditsUsed,
      previousBalanceCredits,
      nextBalanceCredits: transactionState.nextBalanceCredits,
      grossCredits:
        existingUsageRecord.grossCredits ?? existingUsageRecord.creditsUsed,
      platformFeeCredits: existingUsageRecord.platformFeeCredits ?? 0,
      builderEarningsCredits:
        existingUsageRecord.builderEarningsCredits ??
        Math.max(
          (existingUsageRecord.grossCredits ?? existingUsageRecord.creditsUsed) -
            (existingUsageRecord.platformFeeCredits ?? 0),
          0,
        ),
      result: existingResult,
    });

    if (!transactionState.alreadyRecorded) {
      response.cookies.set(
        mockTransactionsCookieName,
        serializeMockTransactionsCookie(transactionState.nextCookieTransactions),
        mockTransactionsCookieOptions,
      );
    }

    return response;
  }

  if (currentBalanceCredits < requiredCredits) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Eden Leaf’s for this live service run.",
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
    executionKey,
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
        error: "Eden could not record this paid service run. No Leaf’s were charged.",
      },
      { status: 503 },
    );
  }
  const nextTransactionState = ensureUsageTransactionRecorded(
    currentTransactions,
    cookieTransactions,
    buildUsageTransaction({
      id: usageTransactionId,
      userId: session.user.id,
      businessId: business.id,
      serviceId: service.id,
      serviceTitle: service.title,
      requiredCredits,
    }),
    session.user.id,
  );
  const response = NextResponse.json({
    ok: true,
    serviceId: service.id,
    serviceTitle: service.title,
    transactionId: nextTransactionState.transaction.id,
    transactionTitle: nextTransactionState.transaction.title,
    transactionTimestamp: nextTransactionState.transaction.timestamp,
    amountLabel: nextTransactionState.transaction.amountLabel,
    requiredCredits,
    previousBalanceCredits: currentBalanceCredits,
    nextBalanceCredits: nextTransactionState.nextBalanceCredits,
    grossCredits: settlementSnapshot.grossCredits,
    platformFeeCredits: settlementSnapshot.platformFeeCredits,
    builderEarningsCredits: settlementSnapshot.builderEarningsCredits,
    result,
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie(nextTransactionState.nextCookieTransactions),
    mockTransactionsCookieOptions,
  );

  return response;
}

function buildLiveExecutionTransactionId(executionKey: string) {
  return `live-service-usage-${executionKey}`;
}

function buildUsageTransaction(input: {
  id: string;
  userId: string;
  businessId: string;
  serviceId: string;
  serviceTitle: string;
  requiredCredits: number;
}) {
  return {
    id: input.id,
    userId: input.userId,
    businessId: input.businessId,
    serviceId: input.serviceId,
    title: `${input.serviceTitle} run completed`,
    amountLabel: `-${input.requiredCredits} Leaf’s`,
    creditsDelta: -input.requiredCredits,
    direction: "outflow",
    kind: "usage",
    detail: `Live service run completed for ${input.serviceTitle}. Eden recorded the usage and updated builder/platform accounting.`,
    timestamp: "Just now",
    simulated: false,
  } satisfies EdenMockTransaction;
}

function ensureUsageTransactionRecorded(
  currentTransactions: EdenMockTransaction[],
  cookieTransactions: EdenMockTransaction[],
  nextTransaction: EdenMockTransaction,
  userId: string,
) {
  const alreadyRecorded = currentTransactions.some(
    (transaction) => transaction.id === nextTransaction.id,
  );
  const nextCookieTransactions = alreadyRecorded
    ? cookieTransactions
    : [nextTransaction, ...cookieTransactions].slice(0, 40);
  const nextTransactions = alreadyRecorded
    ? currentTransactions
    : [nextTransaction, ...currentTransactions].slice(0, 40);

  return {
    alreadyRecorded,
    transaction: nextTransaction,
    nextCookieTransactions,
    nextBalanceCredits: getUserCreditsBalance(
      userId,
      nextTransactions,
    ),
  };
}
