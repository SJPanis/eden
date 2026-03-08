import type { EdenRole } from "@/modules/core/config/role-nav";
import {
  businessFeeSummary,
  formatCredits,
  getBusinessById,
  getServiceById,
  getUserById,
  transactions,
  type EdenMockFeeSummaryItem,
  type EdenMockTransaction,
} from "@/modules/core/mock-data";
import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";

export type EdenMockSimulationAction =
  | "add_credits"
  | "simulate_purchase"
  | "simulate_hosting_fee"
  | "simulate_service_usage";

export type EdenCreditsDisplaySummary = {
  userBalanceLabel: string;
  businessBalanceLabel?: string;
};

export type EdenCreditsSummary = {
  inflow: number;
  outflow: number;
  reserve: number;
  net: number;
};

export type EdenBusinessBillingSnapshot = {
  userBalanceCredits: number;
  businessBalanceCredits: number;
  usageCredits: number;
  recentTransactions: EdenMockTransaction[];
  summary: EdenCreditsSummary;
  feeBreakdown: EdenMockFeeSummaryItem[];
  hostingCostLabel: string;
};

export type EdenConsumerTransactionHistoryItem = EdenMockTransaction & {
  resultingBalanceCredits: number;
  relatedServiceName?: string;
  relatedServiceHref?: string;
};

export const mockTransactionsCookieName = "eden_v1_mock_transactions";

export function parseMockTransactionsCookie(cookieValue?: string | null) {
  if (!cookieValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cookieValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isMockTransactionRecord);
  } catch {
    return [];
  }
}

export function serializeMockTransactionsCookie(simulatedTransactions: EdenMockTransaction[]) {
  return JSON.stringify(simulatedTransactions);
}

export function mergeWalletTransactions(
  cookieTransactions: EdenMockTransaction[] = [],
  persistedTransactions: EdenMockTransaction[] = [],
) {
  const seenTransactionIds = new Set<string>();
  const mergedTransactions: EdenMockTransaction[] = [];

  for (const transaction of [...cookieTransactions, ...persistedTransactions]) {
    if (seenTransactionIds.has(transaction.id)) {
      continue;
    }

    seenTransactionIds.add(transaction.id);
    mergedTransactions.push(transaction);
  }

  return mergedTransactions;
}

export function getEffectiveTransactions(simulatedTransactions: EdenMockTransaction[] = []) {
  return [...simulatedTransactions, ...transactions];
}

export function getTransactionsForUser(
  userId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  return getEffectiveTransactions(simulatedTransactions).filter(
    (transaction) => transaction.userId === userId,
  );
}

export function getTransactionsForBusiness(
  businessId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  return getEffectiveTransactions(simulatedTransactions).filter(
    (transaction) => transaction.businessId === businessId,
  );
}

export function getRecentTransactions(
  options: {
    userId?: string;
    businessId?: string;
    limit?: number;
  },
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  const { userId, businessId, limit = 6 } = options;
  const scopedTransactions = businessId
    ? getTransactionsForBusiness(businessId, simulatedTransactions)
    : userId
      ? getTransactionsForUser(userId, simulatedTransactions)
      : getEffectiveTransactions(simulatedTransactions);

  return scopedTransactions.slice(0, limit);
}

export function getRecentUserTransactionHistory(
  options: {
    userId: string;
    limit?: number;
  },
  simulatedTransactions: EdenMockTransaction[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
  workspaceServices: EdenMockWorkspaceServiceState[] = [],
) {
  const scopedTransactions = getRecentTransactions(
    {
      userId: options.userId,
      limit: options.limit ?? 6,
    },
    simulatedTransactions,
  );
  let runningBalance = getUserCreditsBalance(options.userId, simulatedTransactions);

  return scopedTransactions.map((transaction) => {
    const historyItem: EdenConsumerTransactionHistoryItem = {
      ...transaction,
      resultingBalanceCredits: runningBalance,
      relatedServiceName: transaction.serviceId
        ? getServiceById(transaction.serviceId, createdBusiness, workspaceServices)?.title
        : undefined,
      relatedServiceHref:
        transaction.kind === "usage" && transaction.serviceId
          ? `/services/${transaction.serviceId}`
          : undefined,
    };

    runningBalance -= transaction.creditsDelta;
    return historyItem;
  });
}

export function getCreditsSummary(
  scopedTransactions: EdenMockTransaction[],
): EdenCreditsSummary {
  const inflow = scopedTransactions
    .filter((transaction) => transaction.creditsDelta > 0)
    .reduce((total, transaction) => total + transaction.creditsDelta, 0);
  const outflow = scopedTransactions
    .filter((transaction) => transaction.creditsDelta < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.creditsDelta), 0);
  const reserve = scopedTransactions
    .filter(
      (transaction) =>
        transaction.direction === "reserve" || transaction.kind === "reserve",
    )
    .reduce((total, transaction) => total + getCreditsFromAmountLabel(transaction.amountLabel), 0);

  return {
    inflow,
    outflow,
    reserve,
    net: inflow - outflow,
  };
}

export function getUserCreditsBalance(
  userId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  const user = getUserById(userId);
  const simulatedDelta = simulatedTransactions
    .filter((transaction) => transaction.userId === userId)
    .reduce((total, transaction) => total + transaction.creditsDelta, 0);

  return (user?.edenBalanceCredits ?? 0) + simulatedDelta;
}

export function getBusinessCreditsBalance(
  businessId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
) {
  const business = getBusinessById(businessId, createdBusiness);
  const simulatedDelta = simulatedTransactions
    .filter((transaction) => transaction.businessId === businessId)
    .reduce((total, transaction) => total + transaction.creditsDelta, 0);

  return (business?.creditBalanceCredits ?? 0) + simulatedDelta;
}

export function getBusinessUsageCredits(
  businessId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  return getTransactionsForBusiness(businessId, simulatedTransactions)
    .filter((transaction) => transaction.kind === "usage" && transaction.creditsDelta < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.creditsDelta), 0);
}

export function getCreditFlowSummary(simulatedTransactions: EdenMockTransaction[] = []) {
  return getCreditsSummary(getEffectiveTransactions(simulatedTransactions));
}

export function getFeeBreakdown(
  businessId: string,
  simulatedTransactions: EdenMockTransaction[] = [],
) {
  const businessTransactions = getTransactionsForBusiness(businessId, simulatedTransactions);
  const latestHostingTransaction = businessTransactions.find(
    (transaction) => transaction.kind === "hosting",
  );
  const latestPlatformFee = businessTransactions.find((transaction) => transaction.kind === "fee");
  const latestUsage = businessTransactions.find((transaction) => transaction.kind === "usage");

  return businessFeeSummary.map((item) => {
    if (item.id === "fee-01" && latestPlatformFee) {
      return {
        ...item,
        value: latestPlatformFee.amountLabel,
        detail: `${item.detail} Latest staged fee event: ${latestPlatformFee.title}.`,
      };
    }

    if (item.id === "fee-03" && latestHostingTransaction) {
      return {
        ...item,
        value: latestHostingTransaction.amountLabel,
        detail: `${item.detail} Latest hosting event: ${latestHostingTransaction.title}.`,
      };
    }

    if (item.id === "fee-02" && latestUsage) {
      return {
        ...item,
        detail: `${item.detail} Recent usage settled through ${latestUsage.title.toLowerCase()}.`,
      };
    }

    return item;
  });
}

export function getCreditsDisplaySummary(
  options: {
    userId: string;
    role: EdenRole;
    businessId?: string;
  },
  simulatedTransactions: EdenMockTransaction[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
): EdenCreditsDisplaySummary {
  const { userId, businessId } = options;
  const resolvedBusinessId =
    businessId ??
    (createdBusiness?.business.ownerUserId === userId ? createdBusiness.business.id : undefined) ??
    getUserById(userId)?.businessIds[0] ??
    undefined;

  return {
    userBalanceLabel: formatCredits(getUserCreditsBalance(userId, simulatedTransactions)),
    businessBalanceLabel: resolvedBusinessId
      ? formatCredits(
          getBusinessCreditsBalance(
            resolvedBusinessId,
            simulatedTransactions,
            createdBusiness,
          ),
        )
      : undefined,
  };
}

export function getBusinessBillingSnapshot(
  options: {
    userId: string;
    businessId: string;
  },
  simulatedTransactions: EdenMockTransaction[] = [],
  createdBusiness?: EdenMockCreatedBusinessState | null,
): EdenBusinessBillingSnapshot {
  const { userId, businessId } = options;
  const recentTransactions = getRecentTransactions(
    {
      businessId,
      limit: 5,
    },
    simulatedTransactions,
  );
  const hostingCostLabel =
    recentTransactions.find((transaction) => transaction.kind === "hosting")?.amountLabel ??
    businessFeeSummary.find((item) => item.id === "fee-03")?.value ??
    "$18/mo";

  return {
    userBalanceCredits: getUserCreditsBalance(userId, simulatedTransactions),
    businessBalanceCredits: getBusinessCreditsBalance(
      businessId,
      simulatedTransactions,
      createdBusiness,
    ),
    usageCredits: getBusinessUsageCredits(businessId, simulatedTransactions),
    recentTransactions,
    summary: getCreditsSummary(getTransactionsForBusiness(businessId, simulatedTransactions)),
    feeBreakdown: getFeeBreakdown(businessId, simulatedTransactions),
    hostingCostLabel,
  };
}

export function resolveBusinessContext(
  userId: string,
  preferredBusinessId?: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
) {
  if (
    preferredBusinessId &&
    createdBusiness?.business.id === preferredBusinessId &&
    createdBusiness.business.ownerUserId === userId
  ) {
    return preferredBusinessId;
  }

  if (preferredBusinessId && getBusinessById(preferredBusinessId)) {
    return preferredBusinessId;
  }

  if (createdBusiness?.business.ownerUserId === userId) {
    return createdBusiness.business.id;
  }

  const user = getUserById(userId);
  return user?.businessIds[0];
}

export function getSimulationTargetBusinessId(
  role: EdenRole,
  userId: string,
  preferredBusinessId?: string,
  createdBusiness?: EdenMockCreatedBusinessState | null,
) {
  if (role === "consumer") {
    return undefined;
  }

  return resolveBusinessContext(userId, preferredBusinessId, createdBusiness);
}

export function buildSimulationTransaction(options: {
  action: EdenMockSimulationAction;
  userId: string;
  businessId?: string;
  transactionIndex: number;
  createdBusiness?: EdenMockCreatedBusinessState | null;
  serviceUsagePriceCredits?: number | null;
  serviceUsageId?: string | null;
  serviceUsageTitle?: string | null;
}): EdenMockTransaction {
  const {
    action,
    userId,
    businessId,
    transactionIndex,
    createdBusiness,
    serviceUsagePriceCredits,
    serviceUsageId,
    serviceUsageTitle,
  } = options;
  const prefix = `simulation-${transactionIndex}`;
  const scope =
    businessId && getBusinessById(businessId, createdBusiness)
      ? { businessId }
      : {
          userId,
        };

  if (action === "add_credits") {
    return {
      id: `${prefix}-add-credits`,
      ...scope,
      title: businessId ? "Workspace credits top-up" : "Wallet credits top-up",
      amountLabel: "+250 credits",
      creditsDelta: 250,
      direction: "inflow",
      kind: "wallet",
      detail: businessId
        ? "Development-only top-up added to the active business workspace."
        : "Development-only top-up added to the active user wallet.",
      timestamp: "Just now",
      simulated: true,
    };
  }

  if (action === "simulate_purchase") {
    return {
      id: `${prefix}-purchase`,
      ...scope,
      title: businessId ? "Mock service purchase settled" : "Mock consumer purchase settled",
      amountLabel: businessId ? "+180 credits" : "-120 credits",
      creditsDelta: businessId ? 180 : -120,
      direction: businessId ? "inflow" : "outflow",
      kind: businessId ? "wallet" : "usage",
      detail: businessId
        ? "A placeholder purchase was routed into the active business wallet."
        : "A placeholder purchase was settled against the active user wallet.",
      timestamp: "Just now",
      simulated: true,
    };
  }

  if (action === "simulate_hosting_fee") {
    return {
      id: `${prefix}-hosting`,
      ...scope,
      title: businessId ? "Hosting fee applied" : "Subscription fee applied",
      amountLabel: businessId ? "-18 credits" : "-12 credits",
      creditsDelta: businessId ? -18 : -12,
      direction: "outflow",
      kind: businessId ? "hosting" : "fee",
      detail: businessId
        ? "A development-only hosting fee was posted against the active workspace."
        : "A development-only subscription fee was posted against the active wallet.",
      timestamp: "Just now",
      simulated: true,
    };
  }

  const usageCredits =
    typeof serviceUsagePriceCredits === "number" && serviceUsagePriceCredits > 0
      ? Math.round(serviceUsagePriceCredits)
      : businessId
        ? 60
        : 40;
  const usageTitle = serviceUsageTitle?.trim() || undefined;

  return {
    id: `${prefix}-usage`,
    ...scope,
    serviceId: serviceUsageId ?? undefined,
    title: usageTitle
      ? `${usageTitle} usage settled`
      : businessId
        ? "Service usage settled"
        : "Discovery usage settled",
    amountLabel: `-${usageCredits} credits`,
    creditsDelta: -usageCredits,
    direction: "outflow",
    kind: "usage",
    detail: usageTitle
      ? businessId
        ? `A mock ${usageTitle} run was recorded against the active workspace at the current service rate.`
        : `A mock ${usageTitle} run was recorded against the active user wallet at the current service rate.`
      : businessId
        ? "A placeholder service usage event was posted against the active workspace."
        : "A placeholder discovery usage event was posted against the active user wallet.",
    timestamp: "Just now",
    simulated: true,
  };
}

export function buildPaymentTopUpTransaction(input: {
  sessionId: string;
  userId?: string | null;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
  timestampLabel?: string;
}): EdenMockTransaction {
  return {
    id: `payment-topup-${input.sessionId}`,
    userId: input.userId ?? undefined,
    title: `${input.providerLabel} top-up settled`,
    amountLabel: `+${input.creditsAmount} credits`,
    creditsDelta: input.creditsAmount,
    direction: "inflow",
    kind: "wallet",
    detail: `${input.providerLabel} completed a one-time ${formatMoneyFromCents(
      input.amountCents,
      input.currency,
    )} payment for ${formatCredits(input.creditsAmount)}.`,
    timestamp: input.timestampLabel ?? "Just now",
    simulated: false,
  };
}

function getCreditsFromAmountLabel(amountLabel: string) {
  const normalized = amountLabel.toLowerCase();
  if (!normalized.includes("credit")) {
    return 0;
  }

  const match = amountLabel.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match) {
    return 0;
  }

  return Math.abs(Number.parseFloat(match[0].replace(/,/g, "")));
}

function formatMoneyFromCents(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function isMockTransactionRecord(value: unknown): value is EdenMockTransaction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EdenMockTransaction>;
  return (
    typeof candidate.id === "string" &&
    (typeof candidate.serviceId === "string" || typeof candidate.serviceId === "undefined") &&
    typeof candidate.title === "string" &&
    typeof candidate.amountLabel === "string" &&
    typeof candidate.creditsDelta === "number" &&
    typeof candidate.direction === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.detail === "string" &&
    typeof candidate.timestamp === "string"
  );
}
