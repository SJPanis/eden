import "server-only";

import { createPrismaPayoutSettlementRepo } from "@/modules/core/repos/prisma-payout-settlement-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type {
  EdenRepoPayoutSettlementRecord,
  EdenRepoPayoutSettlementStatus,
} from "@/modules/core/repos/repo-types";
import { loadBusinessCatalog } from "@/modules/core/services/business-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";

export type EdenPayoutSettlementHistoryItem = {
  id: string;
  businessId: string;
  businessName: string;
  amountCredits: number;
  status: EdenRepoPayoutSettlementStatus;
  reference?: string | null;
  notes?: string | null;
  createdAtLabel: string;
  settledAtLabel?: string | null;
};

export type EdenPayoutSettlementHistorySummary = {
  source: "persistent" | "mock_fallback";
  totalSettledCredits: number;
  totalPendingCredits: number;
  totalCanceledCredits: number;
  pendingCount: number;
  settledCount: number;
  canceledCount: number;
  history: EdenPayoutSettlementHistoryItem[];
};

export async function recordMockPayoutSettlement(input: {
  businessId: string;
  amountCredits: number;
  status?: EdenRepoPayoutSettlementStatus;
  reference?: string | null;
  notes?: string | null;
}) {
  try {
    const repo = createPrismaPayoutSettlementRepo(getPrismaClient());
    const record = await repo.create({
      businessId: input.businessId,
      amountCredits: input.amountCredits,
      status: input.status ?? "settled",
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      settledAt:
        input.status === "pending" || input.status === "canceled"
          ? null
          : new Date(),
    });

    return {
      recorded: true,
      source: "persistent" as const,
      settlement: record,
    };
  } catch (error) {
    logPayoutSettlementFailure("record_mock_payout_settlement", error);

    return {
      recorded: false,
      source: "mock_fallback" as const,
      settlement: null,
    };
  }
}

export async function loadBusinessPayoutSettlementHistory(
  businessId: string,
  options: EdenReadServiceOptions & {
    limit?: number;
  } = {},
): Promise<EdenPayoutSettlementHistorySummary> {
  try {
    const repo = createPrismaPayoutSettlementRepo(getPrismaClient());
    const [records, businesses] = await Promise.all([
      repo.listByBusinessId({
        businessId,
        limit: options.limit ?? 8,
      }),
      loadBusinessCatalog({
        createdBusiness: options.createdBusiness,
      }),
    ]);

    return buildPayoutSettlementHistorySummary(
      records,
      new Map(businesses.map((business) => [business.id, business])),
    );
  } catch (error) {
    logPayoutSettlementFailure("load_business_payout_settlement_history", error);
    return emptyPayoutSettlementHistorySummary();
  }
}

export async function loadOwnerPayoutSettlementHistory(
  options: EdenReadServiceOptions & {
    limit?: number;
  } = {},
): Promise<EdenPayoutSettlementHistorySummary> {
  try {
    const repo = createPrismaPayoutSettlementRepo(getPrismaClient());
    const [records, businesses] = await Promise.all([
      repo.listAll({
        limit: options.limit ?? 12,
      }),
      loadBusinessCatalog({
        createdBusiness: options.createdBusiness,
      }),
    ]);

    return buildPayoutSettlementHistorySummary(
      records,
      new Map(businesses.map((business) => [business.id, business])),
    );
  } catch (error) {
    logPayoutSettlementFailure("load_owner_payout_settlement_history", error);
    return emptyPayoutSettlementHistorySummary();
  }
}

function buildPayoutSettlementHistorySummary(
  records: EdenRepoPayoutSettlementRecord[],
  businessLookup: Map<string, { id: string; name: string }>,
): EdenPayoutSettlementHistorySummary {
  return records.reduce<EdenPayoutSettlementHistorySummary>(
    (summary, record) => {
      if (record.status === "settled") {
        summary.totalSettledCredits += record.amountCredits;
        summary.settledCount += 1;
      } else if (record.status === "pending") {
        summary.totalPendingCredits += record.amountCredits;
        summary.pendingCount += 1;
      } else if (record.status === "canceled") {
        summary.totalCanceledCredits += record.amountCredits;
        summary.canceledCount += 1;
      }

      const businessName =
        businessLookup.get(record.businessId)?.name ?? "Unknown business";

      summary.history.push({
        id: record.id,
        businessId: record.businessId,
        businessName,
        amountCredits: record.amountCredits,
        status: record.status,
        reference: record.reference,
        notes: record.notes,
        createdAtLabel: formatPayoutTimestamp(record.createdAt),
        settledAtLabel: record.settledAt
          ? formatPayoutTimestamp(record.settledAt)
          : null,
      });

      return summary;
    },
    {
      source: "persistent",
      totalSettledCredits: 0,
      totalPendingCredits: 0,
      totalCanceledCredits: 0,
      pendingCount: 0,
      settledCount: 0,
      canceledCount: 0,
      history: [],
    },
  );
}

function emptyPayoutSettlementHistorySummary(): EdenPayoutSettlementHistorySummary {
  return {
    source: "mock_fallback",
    totalSettledCredits: 0,
    totalPendingCredits: 0,
    totalCanceledCredits: 0,
    pendingCount: 0,
    settledCount: 0,
    canceledCount: 0,
    history: [],
  };
}

function formatPayoutTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function logPayoutSettlementFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown payout settlement error";
  console.warn(`[eden][payout-settlements][${operation}] ${detail}`);
}
