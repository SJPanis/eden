import "server-only";

import { createPrismaInternalLeavesUsageRepo } from "@/modules/core/repos/prisma-internal-leaves-usage-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoInternalLeavesUsageRecord } from "@/modules/core/repos/repo-types";
import { loadBusinessCatalog } from "@/modules/core/services/business-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import { loadUserCatalog } from "@/modules/core/services/user-service";

export type EdenInternalLeavesUsageHistoryItem = {
  id: string;
  businessId: string;
  businessName: string;
  userId?: string | null;
  actorLabel: string;
  amountCredits: number;
  usageType: string;
  usageTypeLabel: string;
  reference?: string | null;
  notes?: string | null;
  createdAtLabel: string;
};

export type EdenInternalLeavesUsageHistorySummary = {
  source: "persistent" | "mock_fallback";
  totalInternalUseCredits: number;
  internalUseCount: number;
  history: EdenInternalLeavesUsageHistoryItem[];
};

export async function recordInternalLeavesUsage(input: {
  businessId: string;
  userId?: string | null;
  amountCredits: number;
  usageType?: string;
  reference?: string | null;
  notes?: string | null;
}) {
  try {
    const repo = createPrismaInternalLeavesUsageRepo(getPrismaClient());
    const record = await repo.create({
      businessId: input.businessId,
      userId: input.userId ?? null,
      amountCredits: input.amountCredits,
      usageType: input.usageType ?? "internal_eden_use",
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    });

    return {
      recorded: true,
      source: "persistent" as const,
      usage: record,
    };
  } catch (error) {
    logInternalLeavesUsageFailure("record_internal_leaves_usage", error);

    return {
      recorded: false,
      source: "mock_fallback" as const,
      usage: null,
    };
  }
}

export async function loadBusinessInternalLeavesUsageHistory(
  businessId: string,
  options: EdenReadServiceOptions & { limit?: number } = {},
): Promise<EdenInternalLeavesUsageHistorySummary> {
  try {
    const repo = createPrismaInternalLeavesUsageRepo(getPrismaClient());
    const [records, businesses, users] = await Promise.all([
      repo.listByBusinessId({
        businessId,
        limit: options.limit ?? 8,
      }),
      loadBusinessCatalog({
        createdBusiness: options.createdBusiness,
      }),
      loadUserCatalog(),
    ]);

    return buildInternalLeavesUsageHistorySummary(records, {
      businessLookup: new Map(businesses.map((business) => [business.id, business])),
      userLookup: new Map(users.map((user) => [user.id, user])),
    });
  } catch (error) {
    logInternalLeavesUsageFailure("load_business_internal_leaves_usage_history", error);
    return emptyInternalLeavesUsageHistorySummary();
  }
}

export async function loadOwnerInternalLeavesUsageHistory(
  options: EdenReadServiceOptions & { limit?: number } = {},
): Promise<EdenInternalLeavesUsageHistorySummary> {
  try {
    const repo = createPrismaInternalLeavesUsageRepo(getPrismaClient());
    const [records, businesses, users] = await Promise.all([
      repo.listAll({
        limit: options.limit ?? 12,
      }),
      loadBusinessCatalog({
        createdBusiness: options.createdBusiness,
      }),
      loadUserCatalog(),
    ]);

    return buildInternalLeavesUsageHistorySummary(records, {
      businessLookup: new Map(businesses.map((business) => [business.id, business])),
      userLookup: new Map(users.map((user) => [user.id, user])),
    });
  } catch (error) {
    logInternalLeavesUsageFailure("load_owner_internal_leaves_usage_history", error);
    return emptyInternalLeavesUsageHistorySummary();
  }
}

function buildInternalLeavesUsageHistorySummary(
  records: EdenRepoInternalLeavesUsageRecord[],
  input: {
    businessLookup: Map<string, { id: string; name: string }>;
    userLookup: Map<string, { id: string; displayName: string; username: string }>;
  },
): EdenInternalLeavesUsageHistorySummary {
  return {
    source: "persistent",
    totalInternalUseCredits: records.reduce(
      (total, record) => total + record.amountCredits,
      0,
    ),
    internalUseCount: records.length,
    history: records.map((record) => {
      const actor = record.userId ? input.userLookup.get(record.userId) : null;

      return {
        id: record.id,
        businessId: record.businessId,
        businessName:
          input.businessLookup.get(record.businessId)?.name ?? "Unknown business",
        userId: record.userId,
        actorLabel: actor?.displayName ?? actor?.username ?? "Unknown operator",
        amountCredits: record.amountCredits,
        usageType: record.usageType,
        usageTypeLabel: formatInternalLeavesUsageType(record.usageType),
        reference: record.reference,
        notes: record.notes,
        createdAtLabel: formatInternalUsageTimestamp(record.createdAt),
      } satisfies EdenInternalLeavesUsageHistoryItem;
    }),
  };
}

function emptyInternalLeavesUsageHistorySummary(): EdenInternalLeavesUsageHistorySummary {
  return {
    source: "mock_fallback",
    totalInternalUseCredits: 0,
    internalUseCount: 0,
    history: [],
  };
}

function formatInternalUsageTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatInternalLeavesUsageType(usageType: string) {
  if (usageType === "internal_eden_use") {
    return "Internal Eden use";
  }

  return usageType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function logInternalLeavesUsageFailure(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail =
    error instanceof Error ? error.message : "Unknown internal Leaves usage error";
  console.warn(`[eden][internal-leaves-usage][${operation}] ${detail}`);
}
