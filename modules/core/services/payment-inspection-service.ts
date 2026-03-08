import "server-only";

import { createPrismaCreditsTopUpPaymentRepo } from "@/modules/core/repos/prisma-credits-topup-payment-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type {
  EdenRepoCreditsTopUpPaymentRecord,
  EdenRepoCreditsTopUpPaymentStatus,
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
};

export async function loadOwnerCreditsTopUpMetrics(options: {
  limit?: number;
} = {}): Promise<EdenOwnerCreditsTopUpMetrics> {
  try {
    const repo = createPrismaCreditsTopUpPaymentRepo(getPrismaClient());
    const payments = await repo.listAll({
      limit: options.limit ?? 10,
    });

    return buildOwnerCreditsTopUpMetrics(payments);
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
    };
  }
}

function buildOwnerCreditsTopUpMetrics(
  payments: EdenRepoCreditsTopUpPaymentRecord[],
): EdenOwnerCreditsTopUpMetrics {
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
    recentPayments: payments.map((payment) => ({
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
    })),
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

function logPaymentInspectionFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown credits top-up inspection error";
  console.warn(`[eden][payments][${operation}] ${detail}`);
}
