import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
  buildSimulationTransaction,
  getUserCreditsBalance,
  getSimulationTargetBusinessId,
  mockTransactionsCookieName,
  serializeMockTransactionsCookie,
  type EdenMockSimulationAction,
} from "@/modules/core/credits/mock-credits";
import { getWalletTransactionState } from "@/modules/core/credits/server";
import {
  getBusinessPipelineSnapshot,
  mockPipelineCookieName,
  parseMockPipelineCookie,
} from "@/modules/core/pipeline/mock-pipeline";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";
import {
  buildUsageSettlementSnapshot,
  resolveServicePricing,
} from "@/modules/core/services/service-pricing";
import { resolveCreditsTopUpPackage } from "@/modules/core/payments/payment-runtime";
import {
  loadDiscoveryServiceById,
  loadServiceById,
  recordServiceUsageEvent,
} from "@/modules/core/services";

const mockTransactionsCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

const allowedSimulationActions = new Set<EdenMockSimulationAction>([
  "add_credits",
  "simulate_purchase",
  "simulate_hosting_fee",
  "simulate_service_usage",
]);

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    action?: EdenMockSimulationAction;
    businessId?: string;
    serviceId?: string;
    packageId?: string;
  };
  const requestedAction = requestBody.action;

  if (!requestedAction || !allowedSimulationActions.has(requestedAction)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock simulation action.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);
  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const {
    cookieTransactions,
    effectiveTransactions: currentTransactions,
  } = await getWalletTransactionState();
  const targetBusinessId = getSimulationTargetBusinessId(
    session.role,
    session.user.id,
    requestBody.businessId,
    createdBusiness,
  );
  const previousUserBalanceCredits = getUserCreditsBalance(
    session.user.id,
    currentTransactions,
  );
  let resolvedServiceId: string | undefined;
  let resolvedService:
    | Awaited<ReturnType<typeof loadDiscoveryServiceById>>
    | Awaited<ReturnType<typeof loadServiceById>>
    | null = null;
  let resolvedUsagePriceCredits: number | null = null;
  let resolvedUsageSettlement:
    | ReturnType<typeof buildUsageSettlementSnapshot>
    | null = null;
  const selectedTopUpPackage =
    requestedAction === "add_credits"
      ? resolveCreditsTopUpPackage(requestBody.packageId)
      : null;

  if (requestedAction === "simulate_service_usage") {
    const workspaceServices = getMockWorkspaceServiceStates(
      parseMockWorkspaceServicesCookie(
        cookieStore.get(mockWorkspaceServicesCookieName)?.value,
      ),
    );
    const pipelineRecords = parseMockPipelineCookie(
      cookieStore.get(mockPipelineCookieName)?.value,
    );
    const pipelineSnapshot = targetBusinessId
      ? getBusinessPipelineSnapshot(
          {
            businessId: targetBusinessId,
            userId: session.user.id,
          },
          currentTransactions,
          pipelineRecords,
          createdBusiness,
          workspaceServices,
        )
      : null;
    resolvedServiceId = requestBody.serviceId ?? pipelineSnapshot?.serviceId;

    if (resolvedServiceId) {
      resolvedService =
        (await loadDiscoveryServiceById(resolvedServiceId, {
          pipelineRecords,
          createdBusiness,
          workspaceServices,
        })) ??
        (await loadServiceById(resolvedServiceId, {
          createdBusiness,
          workspaceServices,
        }));
      resolvedUsagePriceCredits = resolveServicePricing({
        pricePerUse: resolvedService?.pricePerUse,
        pricingType: resolvedService?.pricingType,
        pricingUnit: resolvedService?.pricingUnit,
        pricingModel: resolvedService?.pricingModel,
      }).pricePerUseCredits;
    }
  }

  const nextTransaction = buildSimulationTransaction({
    action: requestedAction,
    userId: session.user.id,
    businessId: targetBusinessId,
    transactionIndex: currentTransactions.length + 1,
    createdBusiness,
    topUpCreditsAmount: selectedTopUpPackage?.creditsAmount,
    topUpAmountCents: selectedTopUpPackage?.amountCents,
    topUpCurrency: selectedTopUpPackage?.currency,
    topUpPackageTitle: selectedTopUpPackage?.title,
    serviceUsagePriceCredits: resolvedUsagePriceCredits,
    serviceUsageId: resolvedService?.id,
    serviceUsageTitle: resolvedService?.title,
  });
  const requiredCredits = Math.abs(nextTransaction.creditsDelta);
  if (requestedAction === "simulate_service_usage" && resolvedService) {
    resolvedUsageSettlement = buildUsageSettlementSnapshot(
      {
        pricePerUse: resolvedService.pricePerUse,
        pricingType: resolvedService.pricingType,
        pricingUnit: resolvedService.pricingUnit,
        pricingModel: resolvedService.pricingModel,
      },
      requiredCredits,
    );
  }

  if (
    requestedAction === "simulate_service_usage" &&
    previousUserBalanceCredits < requiredCredits
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Eden Credits for this service run.",
        insufficientBalance: true,
        requiredCredits,
        currentBalanceCredits: previousUserBalanceCredits,
        nextBalanceCredits: previousUserBalanceCredits,
        serviceId: resolvedServiceId,
      },
      { status: 409 },
    );
  }

  const nextCookieTransactions = [nextTransaction, ...cookieTransactions].slice(0, 40);
  const nextTransactions = [nextTransaction, ...currentTransactions].slice(0, 40);
  const nextUserBalanceCredits = getUserCreditsBalance(
    session.user.id,
    nextTransactions,
  );

  if (requestedAction === "simulate_service_usage") {
    if (resolvedServiceId) {
      await recordServiceUsageEvent({
        serviceId: resolvedServiceId,
        userId: session.user.id,
        usageType: "simulate_service_usage",
        creditsUsed: Math.abs(nextTransaction.creditsDelta),
        grossCredits: resolvedUsageSettlement?.grossCredits ?? Math.abs(nextTransaction.creditsDelta),
        platformFeeCredits: resolvedUsageSettlement?.platformFeeCredits ?? 0,
        builderEarningsCredits:
          resolvedUsageSettlement?.builderEarningsCredits ??
          Math.abs(nextTransaction.creditsDelta),
      });
    }
  }

  const response = NextResponse.json({
    ok: true,
    action: requestedAction,
    transactionId: nextTransaction.id,
    transactionTitle: nextTransaction.title,
    transactionTimestamp: nextTransaction.timestamp,
    amountLabel: nextTransaction.amountLabel,
    creditsUsed: Math.abs(nextTransaction.creditsDelta),
    creditsDelta: nextTransaction.creditsDelta,
    grossCredits: resolvedUsageSettlement?.grossCredits ?? null,
    platformFeeCredits: resolvedUsageSettlement?.platformFeeCredits ?? null,
    builderEarningsCredits: resolvedUsageSettlement?.builderEarningsCredits ?? null,
    requiredCredits,
    previousBalanceCredits: previousUserBalanceCredits,
    nextBalanceCredits: nextUserBalanceCredits,
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie(nextCookieTransactions),
    mockTransactionsCookieOptions,
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    reset: "ledger",
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie([]),
    mockTransactionsCookieOptions,
  );

  return response;
}
