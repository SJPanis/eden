import "server-only";

import { loadRecentPaymentEventLogs } from "@/modules/core/services/payment-event-log-service";
import { getCreditsTopUpPackages } from "@/modules/core/payments/payment-runtime";
import { createPrismaCreditsTopUpPaymentRepo } from "@/modules/core/repos/prisma-credits-topup-payment-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { loadUserById } from "@/modules/core/services/user-service";
import type {
  EdenRepoCreditsTopUpPaymentRecord,
  EdenRepoCreditsTopUpPaymentStatus,
  EdenRepoPaymentEventLogRecord,
  EdenRepoPaymentEventLogStatus,
} from "@/modules/core/repos/repo-types";

export type EdenOwnerCreditsTopUpInspectionItem = {
  id: string;
  provider: string;
  providerLabel: string;
  providerSessionId: string;
  providerPaymentIntentId?: string | null;
  userId?: string | null;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  status: EdenRepoCreditsTopUpPaymentStatus;
  createdAtLabel: string;
  settledAtLabel?: string | null;
  failureReason?: string | null;
};

export type EdenOwnerCreditsTopUpMetrics = {
  source: "persistent" | "mock_fallback";
  totalPayments: number;
  pendingCount: number;
  settledCount: number;
  failedCount: number;
  canceledCount: number;
  totalCreditsSettled: number;
  totalSettledAmountCents: number;
  recentPayments: EdenOwnerCreditsTopUpInspectionItem[];
  paymentEventLogsSource: "persistent" | "mock_fallback";
  recentEventLogCount: number;
  recentEventLogs: Array<{
    id: string;
    provider: string;
    eventType: string;
    eventTypeLabel: string;
    providerEventId?: string | null;
    providerSessionId?: string | null;
    creditsTopUpPaymentId?: string | null;
    relatedUserId?: string | null;
    status: EdenRepoPaymentEventLogStatus;
    createdAtLabel: string;
    metadataSummary: string[];
  }>;
};

export type EdenOwnerCreditsTopUpPaymentDetail = {
  source: "persistent";
  payment: EdenOwnerCreditsTopUpInspectionItem;
  relatedUser: Awaited<ReturnType<typeof loadUserById>> | null;
  packageInfo: {
    id?: string | null;
    title: string;
    detail?: string | null;
    chargeLabel?: string | null;
  } | null;
  settlementResultLabel: string;
  recentEventLogs: Array<{
    id: string;
    provider: string;
    eventType: string;
    eventTypeLabel: string;
    providerEventId?: string | null;
    providerSessionId?: string | null;
    creditsTopUpPaymentId?: string | null;
    relatedUserId?: string | null;
    status: EdenRepoPaymentEventLogStatus;
    createdAtLabel: string;
    metadataSummary: string[];
  }>;
};

export type EdenOwnerUserCreditsTopUpHistoryItem = EdenOwnerCreditsTopUpInspectionItem & {
  packageInfo: {
    id?: string | null;
    title: string;
    detail?: string | null;
    chargeLabel?: string | null;
  } | null;
  settlementResultLabel: string;
};

export async function loadOwnerCreditsTopUpMetrics(options: {
  limit?: number;
} = {}): Promise<EdenOwnerCreditsTopUpMetrics> {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    const [payments, eventLogs] = await Promise.all([
      repo.listAll({
        limit: options.limit ?? 10,
      }),
      loadRecentPaymentEventLogs({
        limit: options.limit ?? 10,
        provider: "stripe",
      }),
    ]);

    return buildOwnerCreditsTopUpMetrics(payments, eventLogs);
  } catch (error) {
    logPaymentInspectionFailure("load_owner_credits_topup_metrics", error);

    return {
      source: "mock_fallback",
      totalPayments: 0,
      pendingCount: 0,
      settledCount: 0,
      failedCount: 0,
      canceledCount: 0,
      totalCreditsSettled: 0,
      totalSettledAmountCents: 0,
      recentPayments: [],
      paymentEventLogsSource: "mock_fallback",
      recentEventLogCount: 0,
      recentEventLogs: [],
    };
  }
}

export async function loadOwnerCreditsTopUpPaymentDetail(
  paymentId: string,
): Promise<EdenOwnerCreditsTopUpPaymentDetail | null> {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    const payment = await repo.findById(paymentId);

    if (!payment) {
      return null;
    }

    const [relatedUser, eventLogs] = await Promise.all([
      payment.userId ? loadUserById(payment.userId) : Promise.resolve(null),
      loadRecentPaymentEventLogs({
        limit: 20,
        provider: payment.provider,
        creditsTopUpPaymentId: payment.id,
      }),
    ]);

    return {
      source: "persistent",
      payment: mapPaymentToInspectionItem(payment),
      relatedUser,
      packageInfo: resolvePaymentPackageInfo(payment, eventLogs),
      settlementResultLabel: resolveSettlementResultLabel(payment, eventLogs),
      recentEventLogs: eventLogs.map((eventLog) =>
        mapPaymentEventLogToInspectionItem(eventLog, payment),
      ),
    };
  } catch (error) {
    logPaymentInspectionFailure("load_owner_credits_topup_payment_detail", error);
    return null;
  }
}

export async function loadOwnerCreditsTopUpPaymentsForUser(
  userId: string,
  options: {
    limit?: number;
  } = {},
): Promise<{
  source: "persistent" | "mock_fallback";
  payments: EdenOwnerUserCreditsTopUpHistoryItem[];
}> {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    const payments = await repo.listAll({
      userId,
      limit: options.limit ?? 12,
    });

    const paymentsWithContext = await Promise.all(
      payments.map(async (payment) => {
        const eventLogs = await loadRecentPaymentEventLogs({
          limit: 10,
          provider: payment.provider,
          creditsTopUpPaymentId: payment.id,
        });

        return {
          ...mapPaymentToInspectionItem(payment),
          packageInfo: resolvePaymentPackageInfo(payment, eventLogs),
          settlementResultLabel: resolveSettlementResultLabel(payment, eventLogs),
        } satisfies EdenOwnerUserCreditsTopUpHistoryItem;
      }),
    );

    return {
      source: "persistent",
      payments: paymentsWithContext,
    };
  } catch (error) {
    logPaymentInspectionFailure("load_owner_credits_topup_payments_for_user", error);
    return {
      source: "mock_fallback",
      payments: [],
    };
  }
}

function buildOwnerCreditsTopUpMetrics(
  payments: EdenRepoCreditsTopUpPaymentRecord[],
  eventLogs: EdenRepoPaymentEventLogRecord[],
): EdenOwnerCreditsTopUpMetrics {
  const paymentsById = new Map(payments.map((payment) => [payment.id, payment]));
  const paymentsBySessionId = new Map(
    payments.map((payment) => [payment.providerSessionId, payment]),
  );
  const summary = payments.reduce(
    (accumulator, payment) => {
      accumulator.totalPayments += 1;

      if (payment.status === "pending") {
        accumulator.pendingCount += 1;
      } else if (payment.status === "settled") {
        accumulator.settledCount += 1;
        accumulator.totalCreditsSettled += payment.creditsAmount;
        accumulator.totalSettledAmountCents += payment.amountCents;
      } else if (payment.status === "failed") {
        accumulator.failedCount += 1;
      } else if (payment.status === "canceled") {
        accumulator.canceledCount += 1;
      }

      return accumulator;
    },
    {
      totalPayments: 0,
      pendingCount: 0,
      settledCount: 0,
      failedCount: 0,
      canceledCount: 0,
      totalCreditsSettled: 0,
      totalSettledAmountCents: 0,
    },
  );

  return {
    source: "persistent",
    ...summary,
    recentPayments: payments.map(mapPaymentToInspectionItem),
    paymentEventLogsSource: "persistent",
    recentEventLogCount: eventLogs.length,
    recentEventLogs: eventLogs.map((eventLog) =>
      mapPaymentEventLogToInspectionItem(
        eventLog,
        resolveEventLogPaymentContext(eventLog, paymentsById, paymentsBySessionId),
      ),
    ),
  };
}

function mapPaymentToInspectionItem(
  payment: EdenRepoCreditsTopUpPaymentRecord,
): EdenOwnerCreditsTopUpInspectionItem {
  return {
    id: payment.id,
    provider: payment.provider,
    providerLabel: getProviderLabel(payment.provider),
    providerSessionId: payment.providerSessionId,
    providerPaymentIntentId: payment.providerPaymentIntentId,
    userId: payment.userId,
    creditsAmount: payment.creditsAmount,
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: payment.status,
    createdAtLabel: formatInspectionTimestamp(payment.createdAt),
    settledAtLabel: payment.settledAt
      ? formatInspectionTimestamp(payment.settledAt)
      : null,
    failureReason: payment.failureReason,
  };
}

function mapPaymentEventLogToInspectionItem(
  eventLog: EdenRepoPaymentEventLogRecord,
  payment?: EdenRepoCreditsTopUpPaymentRecord | null,
) {
  return {
    id: eventLog.id,
    provider: eventLog.provider,
    eventType: eventLog.eventType,
    eventTypeLabel: formatPaymentEventTypeLabel(eventLog.eventType),
    providerEventId: eventLog.providerEventId,
    providerSessionId: eventLog.providerSessionId,
    creditsTopUpPaymentId: eventLog.creditsTopUpPaymentId,
    relatedUserId: payment?.userId ?? null,
    status: eventLog.status,
    createdAtLabel: formatInspectionTimestamp(eventLog.createdAt),
    metadataSummary: buildPaymentEventMetadataSummary(eventLog),
  };
}

function getProviderLabel(provider: string) {
  return provider === "stripe" ? "Stripe Checkout" : provider;
}

function formatInspectionTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPaymentEventTypeLabel(eventType: string) {
  return eventType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildPaymentEventMetadataSummary(eventLog: EdenRepoPaymentEventLogRecord) {
  const metadata = eventLog.metadata ?? {};
  const summary: string[] = [];

  if (metadata.eventType) {
    summary.push(`Stripe type: ${metadata.eventType}`);
  }

  if (metadata.checkoutStatus) {
    summary.push(`Checkout: ${metadata.checkoutStatus}`);
  }

  if (metadata.creditsAmount) {
    summary.push(`Leaf’s: ${metadata.creditsAmount}`);
  }

  if (metadata.amountCents && metadata.currency) {
    summary.push(
      `Amount: ${formatMoneyAmount(Number(metadata.amountCents), String(metadata.currency))}`,
    );
  }

  if (metadata.reason) {
    summary.push(`Reason: ${metadata.reason}`);
  }

  if (metadata.settlementResult) {
    summary.push(`Settlement: ${metadata.settlementResult}`);
  }

  return summary.slice(0, 3);
}

function resolvePaymentPackageInfo(
  payment: EdenRepoCreditsTopUpPaymentRecord,
  eventLogs: EdenRepoPaymentEventLogRecord[],
) {
  const packageId = eventLogs.find((eventLog) => {
    const metadata = eventLog.metadata ?? {};
    return typeof metadata.packageId === "string" && metadata.packageId.length > 0;
  })?.metadata?.packageId;
  const availablePackages = getCreditsTopUpPackages();

  if (typeof packageId === "string") {
    const matchedPackage = availablePackages.find((pkg) => pkg.id === packageId);

    if (matchedPackage) {
      return {
        id: matchedPackage.id,
        title: matchedPackage.title,
        detail: matchedPackage.detail,
        chargeLabel: matchedPackage.chargeLabel,
      };
    }
  }

  const inferredPackage = availablePackages.find(
    (pkg) =>
      pkg.creditsAmount === payment.creditsAmount &&
      pkg.amountCents === payment.amountCents &&
      pkg.currency === payment.currency,
  );

  if (inferredPackage) {
    return {
      id: inferredPackage.id,
      title: inferredPackage.title,
      detail: inferredPackage.detail,
      chargeLabel: inferredPackage.chargeLabel,
    };
  }

  return {
    id: null,
    title: `${payment.creditsAmount.toLocaleString()} Leaf’s`,
    detail: "Derived from the persisted payment record.",
    chargeLabel: formatMoneyAmount(payment.amountCents, payment.currency),
  };
}

function resolveSettlementResultLabel(
  payment: EdenRepoCreditsTopUpPaymentRecord,
  eventLogs: EdenRepoPaymentEventLogRecord[],
) {
  const settlementMetadata = eventLogs.find((eventLog) => {
    const metadata = eventLog.metadata ?? {};
    return typeof metadata.settlementResult === "string" && metadata.settlementResult.length > 0;
  })?.metadata?.settlementResult;

  if (typeof settlementMetadata === "string") {
    return formatPaymentEventTypeLabel(settlementMetadata);
  }

  if (payment.status === "settled") {
    return "Settled";
  }

  if (payment.status === "failed") {
    return "Settlement failed";
  }

  if (payment.status === "canceled") {
    return "Canceled before settlement";
  }

  return "Awaiting webhook settlement";
}

function resolveEventLogPaymentContext(
  eventLog: EdenRepoPaymentEventLogRecord,
  paymentsById: Map<string, EdenRepoCreditsTopUpPaymentRecord>,
  paymentsBySessionId: Map<string, EdenRepoCreditsTopUpPaymentRecord>,
) {
  if (eventLog.creditsTopUpPaymentId) {
    return paymentsById.get(eventLog.creditsTopUpPaymentId) ?? null;
  }

  if (eventLog.providerSessionId) {
    return paymentsBySessionId.get(eventLog.providerSessionId) ?? null;
  }

  return null;
}

function formatMoneyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function logPaymentInspectionFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown credits top-up inspection error";
  console.warn(`[eden][payments][${operation}] ${detail}`);
}
