import "server-only";

import { Prisma } from "@prisma/client";
import { getEffectiveTransactions } from "@/modules/core/credits/mock-credits";
import { getBusinessPipelineSnapshot } from "@/modules/core/pipeline/mock-pipeline";
import type {
  EdenMockBusiness,
  EdenMockService,
  EdenMockTransaction,
} from "@/modules/core/mock-data";
import { createPrismaServiceUsageRepo } from "@/modules/core/repos/prisma-service-usage-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import type { EdenRepoServiceUsageRecord } from "@/modules/core/repos/repo-types";
import { loadBusinessCatalog } from "@/modules/core/services/business-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";
import { loadServiceCatalog } from "@/modules/core/services/service-catalog-service";
import { loadUserCatalog } from "@/modules/core/services/user-service";
import {
  buildUsageSettlementSnapshot,
  calculatePlatformFeeCredits,
  edenPlatformFeeRate,
  resolveUsageGrossCredits,
} from "@/modules/core/services/service-pricing";

export type EdenServiceUsageType =
  | "simulate_service_usage"
  | "live_service_execution";
export type EdenServiceUsageSource = "persistent" | "mock_fallback";

export type EdenUsageMonetizationProjection = {
  estimatedGrossCredits: number;
  estimatedPlatformEarningsCredits: number;
  estimatedBuilderEarningsCredits: number;
  pricingRuleLabel: string;
};

export type EdenServiceUsageEvent = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  businessId: string;
  businessName: string;
  userId?: string | null;
  userDisplayName: string;
  username?: string | null;
  usageType: string;
  creditsUsed: number;
  estimatedGrossCredits: number;
  platformFeeCredits: number;
  builderEarningsCredits: number;
  timestampLabel: string;
  source: EdenServiceUsageSource;
};

export type EdenServiceUsageBreakdown = {
  serviceId: string;
  serviceTitle: string;
  businessId: string;
  businessName: string;
  usageCount: number;
  totalCreditsUsed: number;
  lastUsedAtLabel: string;
  pricingModel?: string | null;
  pricePerUseCredits?: number | null;
  pricingUnit?: string | null;
  monetization: EdenUsageMonetizationProjection;
};

export type EdenBusinessUsageBreakdown = {
  businessId: string;
  businessName: string;
  usageCount: number;
  totalCreditsUsed: number;
  topServiceTitle: string;
  lastUsedAtLabel: string;
  monetization: EdenUsageMonetizationProjection;
};

export type EdenUserUsageServiceBreakdown = {
  serviceId: string;
  serviceTitle: string;
  businessId: string;
  businessName: string;
  usageCount: number;
  totalCreditsUsed: number;
  lastUsedAtLabel: string;
  projectedCustomerValueCredits: number;
};

export type EdenUserUsageBreakdown = {
  userId?: string | null;
  userDisplayName: string;
  username?: string | null;
  isAnonymousUser: boolean;
  usageCount: number;
  totalCreditsUsed: number;
  usageSharePercent: number;
  topServiceTitle: string;
  lastUsedAtLabel: string;
  projectedCustomerValueCredits: number;
  perService: EdenUserUsageServiceBreakdown[];
  monetization: EdenUsageMonetizationProjection;
};

export type EdenUserUsageConcentration = {
  distinctUsers: number;
  anonymousUsageEvents: number;
  topUserSharePercent: number;
  topThreeUsersSharePercent: number;
};

export type EdenOwnerServiceUsageMetrics = {
  totalUsageEvents: number;
  totalCreditsUsed: number;
  source: EdenServiceUsageSource;
  topServices: EdenServiceUsageBreakdown[];
  topBusinesses: EdenBusinessUsageBreakdown[];
  topUsers: EdenUserUsageBreakdown[];
  recentUserActivity: EdenServiceUsageEvent[];
  userConcentration: EdenUserUsageConcentration;
  monetization: EdenUsageMonetizationProjection;
};

export type EdenBusinessServiceUsageMetrics = {
  businessId: string;
  totalUsageEvents: number;
  totalCreditsUsed: number;
  source: EdenServiceUsageSource;
  perService: EdenServiceUsageBreakdown[];
  recentUsageEvents: EdenServiceUsageEvent[];
  topCustomers: EdenUserUsageBreakdown[];
  recentCustomerActivity: EdenServiceUsageEvent[];
  monetization: EdenUsageMonetizationProjection;
};

type EdenServiceUsageOptions = EdenReadServiceOptions & {
  simulatedTransactions?: EdenMockTransaction[];
};

type EdenResolvedUsageRecord = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  businessId: string;
  businessName: string;
  userId?: string | null;
  userDisplayName: string;
  username?: string | null;
  isAnonymousUser: boolean;
  usageType: string;
  creditsUsed: number;
  grossCredits?: number | null;
  platformFeeCredits?: number | null;
  builderEarningsCredits?: number | null;
  pricingModel?: string | null;
  pricePerUseCredits?: number | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  createdAt: Date;
  source: EdenServiceUsageSource;
};

export async function recordServiceUsageEvent(input: {
  serviceId: string;
  userId?: string | null;
  executionKey?: string | null;
  usageType: EdenServiceUsageType;
  creditsUsed: number;
  grossCredits?: number | null;
  platformFeeCredits?: number | null;
  builderEarningsCredits?: number | null;
  createdAt?: Date;
}) {
  try {
    const repo = createPrismaServiceUsageRepo(getPrismaClient());
    if (input.executionKey) {
      const existingRecord = await repo.findByExecutionKey(input.executionKey);

      if (existingRecord) {
        return {
          recorded: true,
          duplicate: true,
          source: "persistent" as const,
          record: existingRecord,
        };
      }
    }
    const record = await repo.create(input);

    return {
      recorded: Boolean(record),
      duplicate: false,
      source: record ? ("persistent" as const) : ("mock_fallback" as const),
      record,
    };
  } catch (error) {
    if (
      input.executionKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        const repo = createPrismaServiceUsageRepo(getPrismaClient());
        const existingRecord = await repo.findByExecutionKey(input.executionKey);

        if (existingRecord) {
          return {
            recorded: true,
            duplicate: true,
            source: "persistent" as const,
            record: existingRecord,
          };
        }
      } catch (duplicateLookupError) {
        logServiceUsageFailure(
          "load_duplicate_service_usage_record",
          duplicateLookupError,
        );
      }
    }

    logServiceUsageFailure("record_service_usage", error);

    return {
      recorded: false,
      duplicate: false,
      source: "mock_fallback" as const,
      record: null,
    };
  }
}

export async function loadRecordedServiceUsageEvent(executionKey: string) {
  try {
    const repo = createPrismaServiceUsageRepo(getPrismaClient());
    return await repo.findByExecutionKey(executionKey);
  } catch (error) {
    logServiceUsageFailure("load_service_usage_by_execution_key", error);
    return null;
  }
}

export async function loadUsageCountPerService(
  serviceId: string,
  options: EdenServiceUsageOptions = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    serviceId,
  });
  return records.length;
}

export async function loadUsageCountPerBusiness(
  businessId: string,
  options: EdenServiceUsageOptions = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    businessId,
  });
  return records.length;
}

export async function loadRecentUsageByService(
  serviceId: string,
  options: EdenServiceUsageOptions & { limit?: number } = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    serviceId,
  });
  return records.slice(0, options.limit ?? 5).map(mapUsageRecordToEvent);
}

export async function loadRecentUsageByBusiness(
  businessId: string,
  options: EdenServiceUsageOptions & { limit?: number } = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    businessId,
  });
  return records.slice(0, options.limit ?? 6).map(mapUsageRecordToEvent);
}

export async function loadUsageCountByUser(
  userId: string,
  options: EdenServiceUsageOptions = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    userId,
  });
  return records.length;
}

export async function loadRecentUsageByUser(
  userId: string,
  options: EdenServiceUsageOptions & { limit?: number } = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    userId,
  });
  return records.slice(0, options.limit ?? 6).map(mapUsageRecordToEvent);
}

export async function loadPerServiceUsageByUser(
  userId: string,
  options: EdenServiceUsageOptions = {},
) {
  const { records } = await loadScopedUsageRecords(options, {
    userId,
  });
  return buildServiceBreakdowns(records);
}

export async function loadOwnerServiceUsageMetrics(
  options: EdenServiceUsageOptions = {},
): Promise<EdenOwnerServiceUsageMetrics> {
  const datasets = await loadUsageDatasets(options);
  const records = datasets.persistentRecords.length
    ? datasets.persistentRecords
    : datasets.fallbackRecords;
  const source: EdenServiceUsageSource = datasets.persistentRecords.length
    ? "persistent"
    : "mock_fallback";
  const totalCreditsUsed = records.reduce(
    (total, record) => total + record.creditsUsed,
    0,
  );
  const topUsers = buildUserBreakdowns(records);

  return {
    totalUsageEvents: records.length,
    totalCreditsUsed,
    source,
    topServices: buildServiceBreakdowns(records).slice(0, 4),
    topBusinesses: buildBusinessBreakdowns(records).slice(0, 4),
    topUsers: topUsers.slice(0, 5),
    recentUserActivity: records.slice(0, 6).map(mapUsageRecordToEvent),
    userConcentration: buildUserConcentration(records, topUsers),
    monetization: buildMonetizationProjection(records),
  };
}

export async function loadBusinessServiceUsageMetrics(
  businessId: string,
  options: EdenServiceUsageOptions = {},
): Promise<EdenBusinessServiceUsageMetrics> {
  const { records, source } = await loadScopedUsageRecords(options, {
    businessId,
  });
  const totalCreditsUsed = records.reduce(
    (total, record) => total + record.creditsUsed,
    0,
  );
  const topCustomers = buildUserBreakdowns(records);

  return {
    businessId,
    totalUsageEvents: records.length,
    totalCreditsUsed,
    source,
    perService: buildServiceBreakdowns(records).slice(0, 6),
    recentUsageEvents: records.slice(0, 6).map(mapUsageRecordToEvent),
    topCustomers: topCustomers.slice(0, 5),
    recentCustomerActivity: records.slice(0, 6).map(mapUsageRecordToEvent),
    monetization: buildMonetizationProjection(records),
  };
}

async function loadScopedUsageRecords(
  options: EdenServiceUsageOptions,
  scope: {
    businessId?: string;
    serviceId?: string;
    userId?: string;
  },
) {
  const datasets = await loadUsageDatasets(options);
  const persistentRecords = filterUsageRecords(datasets.persistentRecords, scope);
  const fallbackRecords = filterUsageRecords(datasets.fallbackRecords, scope);

  if (persistentRecords.length) {
    return {
      records: persistentRecords,
      source: "persistent" as const,
    };
  }

  return {
    records: fallbackRecords,
    source: "mock_fallback" as const,
  };
}

async function loadUsageDatasets(options: EdenServiceUsageOptions) {
  const [businessCatalog, serviceCatalog, userCatalog, persistentRecords] = await Promise.all([
    loadBusinessCatalog({
      createdBusiness: options.createdBusiness,
    }),
    loadServiceCatalog({
      createdBusiness: options.createdBusiness,
      workspaceServices: options.workspaceServices,
    }),
    loadUserCatalog(),
    loadPersistentUsageRecords(),
  ]);
  const businessLookup = new Map(
    businessCatalog.map((business) => [business.id, business]),
  );
  const serviceLookup = new Map(
    serviceCatalog.map((service) => [service.id, service]),
  );
  const userLookup = new Map(userCatalog.map((user) => [user.id, user]));

  return {
    persistentRecords: enrichPersistentUsageRecords(
      persistentRecords ?? [],
      businessLookup,
      serviceLookup,
      userLookup,
    ),
    fallbackRecords: buildFallbackUsageRecords(
      options,
      businessLookup,
      serviceLookup,
      userLookup,
    ),
  };
}

async function loadPersistentUsageRecords() {
  try {
    const repo = createPrismaServiceUsageRepo(getPrismaClient());
    return await repo.listAll();
  } catch (error) {
    logServiceUsageFailure("load_usage_records", error);
    return null;
  }
}

function enrichPersistentUsageRecords(
  records: EdenRepoServiceUsageRecord[],
  businessLookup: Map<string, EdenMockBusiness>,
  serviceLookup: Map<string, EdenMockService>,
  userLookup: Map<string, { displayName: string; username: string }>,
) {
  return records.map((record) => {
    const service = serviceLookup.get(record.serviceId);
    const business = businessLookup.get(record.businessId);
    const userMeta = resolveUsageUserMeta(record.userId, userLookup);

    return {
      id: record.id,
      serviceId: record.serviceId,
      serviceTitle: service?.title ?? record.serviceTitle,
      businessId: record.businessId,
      businessName: business?.name ?? record.businessName,
      userId: userMeta.userId,
      userDisplayName: userMeta.userDisplayName,
      username: userMeta.username,
      isAnonymousUser: userMeta.isAnonymousUser,
      usageType: record.usageType,
      creditsUsed: record.creditsUsed,
      grossCredits: record.grossCredits ?? null,
      platformFeeCredits: record.platformFeeCredits ?? null,
      builderEarningsCredits: record.builderEarningsCredits ?? null,
      pricingModel: service?.pricingModel ?? record.servicePricingModel,
      pricePerUseCredits: service?.pricePerUse ?? record.servicePricePerUse ?? null,
      pricingType: service?.pricingType ?? record.servicePricingType ?? null,
      pricingUnit: service?.pricingUnit ?? record.servicePricingUnit ?? null,
      createdAt: record.createdAt,
      source: "persistent" as const,
    };
  });
}

function buildFallbackUsageRecords(
  options: EdenServiceUsageOptions,
  businessLookup: Map<string, EdenMockBusiness>,
  serviceLookup: Map<string, EdenMockService>,
  userLookup: Map<string, { displayName: string; username: string }>,
) {
  const usageTransactions = getEffectiveTransactions(options.simulatedTransactions ?? []).filter(
    (transaction) => transaction.kind === "usage" && Boolean(transaction.businessId),
  );

  return usageTransactions.flatMap((transaction, index) => {
    const businessId = transaction.businessId;

    if (!businessId) {
      return [];
    }

    const business = businessLookup.get(businessId);

    if (!business) {
      return [];
    }

    const resolvedServiceId = resolveFallbackServiceIdForBusiness(
      business,
      options,
      serviceLookup,
    );
    const service = resolvedServiceId
      ? serviceLookup.get(resolvedServiceId)
      : Array.from(serviceLookup.values()).find(
          (candidate) => candidate.businessId === business.id,
        ) ?? null;

    if (!service) {
      return [];
    }

    const userMeta = resolveUsageUserMeta(transaction.userId, userLookup);
    const settlementSnapshot = buildUsageSettlementSnapshot(
      {
        pricePerUse: service.pricePerUse,
        pricingType: service.pricingType,
        pricingUnit: service.pricingUnit,
        pricingModel: service.pricingModel,
      },
      Math.abs(transaction.creditsDelta),
    );

    return [
      {
        id: `fallback-usage-${transaction.id}`,
        serviceId: service.id,
        serviceTitle: service.title,
        businessId: business.id,
        businessName: business.name,
        userId: userMeta.userId,
        userDisplayName: userMeta.userDisplayName,
        username: userMeta.username,
        isAnonymousUser: userMeta.isAnonymousUser,
        usageType: "simulate_service_usage",
        creditsUsed: Math.abs(transaction.creditsDelta),
        grossCredits: settlementSnapshot.grossCredits,
        platformFeeCredits: settlementSnapshot.platformFeeCredits,
        builderEarningsCredits: settlementSnapshot.builderEarningsCredits,
        pricingModel: service.pricingModel,
        pricePerUseCredits: service.pricePerUse ?? null,
        pricingType: service.pricingType ?? null,
        pricingUnit: service.pricingUnit ?? null,
        createdAt: new Date(Date.now() - index * 60_000),
        source: "mock_fallback" as const,
      },
    ];
  });
}

function resolveFallbackServiceIdForBusiness(
  business: EdenMockBusiness,
  options: EdenServiceUsageOptions,
  serviceLookup: Map<string, EdenMockService>,
) {
  const pipelineSnapshot = getBusinessPipelineSnapshot(
    {
      businessId: business.id,
      userId: business.ownerUserId,
    },
    options.simulatedTransactions ?? [],
    options.pipelineRecords ?? [],
    options.createdBusiness,
    options.workspaceServices ?? [],
  );

  if (pipelineSnapshot?.serviceId) {
    return pipelineSnapshot.serviceId;
  }

  if (business.featuredServiceId && serviceLookup.has(business.featuredServiceId)) {
    return business.featuredServiceId;
  }

  return (
    Array.from(serviceLookup.values()).find(
      (service) => service.businessId === business.id,
    )?.id ?? null
  );
}

function filterUsageRecords(
  records: EdenResolvedUsageRecord[],
  scope: {
    businessId?: string;
    serviceId?: string;
    userId?: string;
  },
) {
  return records.filter((record) => {
    if (scope.businessId && record.businessId !== scope.businessId) {
      return false;
    }

    if (scope.serviceId && record.serviceId !== scope.serviceId) {
      return false;
    }

    if (scope.userId && record.userId !== scope.userId) {
      return false;
    }

    return true;
  });
}

function buildServiceBreakdowns(records: EdenResolvedUsageRecord[]) {
  const groupedRecords = groupUsageRecords(records, (record) => record.serviceId);

  return Array.from(groupedRecords.values())
    .map((serviceRecords) => {
      const latestRecord = serviceRecords[0];
      const totalCreditsUsed = serviceRecords.reduce(
        (total, record) => total + record.creditsUsed,
        0,
      );
      const pricing = resolveCurrentUsagePricing(serviceRecords);

      return {
        serviceId: latestRecord.serviceId,
        serviceTitle: latestRecord.serviceTitle,
        businessId: latestRecord.businessId,
        businessName: latestRecord.businessName,
        usageCount: serviceRecords.length,
        totalCreditsUsed,
        lastUsedAtLabel: formatUsageTimestamp(latestRecord.createdAt),
        pricingModel: pricing.pricingModel,
        pricePerUseCredits: pricing.pricePerUseCredits,
        pricingUnit: pricing.pricingUnit,
        monetization: buildMonetizationProjection(serviceRecords),
      } satisfies EdenServiceUsageBreakdown;
    })
    .sort((left, right) => {
    if (right.usageCount !== left.usageCount) {
      return right.usageCount - left.usageCount;
    }

    return right.totalCreditsUsed - left.totalCreditsUsed;
  });
}

function buildBusinessBreakdowns(records: EdenResolvedUsageRecord[]) {
  const businessMap = new Map<
    string,
    Omit<EdenBusinessUsageBreakdown, "monetization"> & {
      topServiceUsageCount: number;
      perServiceCounts: Map<string, number>;
    }
  >();

  records.forEach((record) => {
    const current = businessMap.get(record.businessId);
    const perServiceCounts = current?.perServiceCounts ?? new Map<string, number>();
    const nextServiceCount = (perServiceCounts.get(record.serviceTitle) ?? 0) + 1;

    perServiceCounts.set(record.serviceTitle, nextServiceCount);

    const topServiceEntry = Array.from(perServiceCounts.entries()).sort(
      (left, right) => right[1] - left[1],
    )[0];
    const totalCreditsUsed = (current?.totalCreditsUsed ?? 0) + record.creditsUsed;

    businessMap.set(record.businessId, {
      businessId: record.businessId,
      businessName: record.businessName,
      usageCount: (current?.usageCount ?? 0) + 1,
      totalCreditsUsed,
      topServiceTitle: topServiceEntry?.[0] ?? record.serviceTitle,
      topServiceUsageCount: topServiceEntry?.[1] ?? nextServiceCount,
      lastUsedAtLabel:
        current?.lastUsedAtLabel ?? formatUsageTimestamp(record.createdAt),
      perServiceCounts,
    });
  });

  const groupedRecords = groupUsageRecords(records, (record) => record.businessId);

  return Array.from(businessMap.values())
    .map((entry) => ({
      businessId: entry.businessId,
      businessName: entry.businessName,
      usageCount: entry.usageCount,
      totalCreditsUsed: entry.totalCreditsUsed,
      topServiceTitle: entry.topServiceTitle,
      lastUsedAtLabel: entry.lastUsedAtLabel,
      monetization: buildMonetizationProjection(
        groupedRecords.get(entry.businessId) ?? [],
      ),
    }))
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return right.totalCreditsUsed - left.totalCreditsUsed;
    });
}

function buildUserBreakdowns(records: EdenResolvedUsageRecord[]) {
  const groupedRecords = groupUsageRecords(
    records,
    (record) => record.userId ?? "__guest__",
  );
  const totalUsageEvents = records.length || 1;

  return Array.from(groupedRecords.values())
    .map((userRecords) => {
      const latestRecord = userRecords[0];
      const totalCreditsUsed = userRecords.reduce(
        (total, record) => total + record.creditsUsed,
        0,
      );
      const perService = buildUserServiceBreakdowns(userRecords);
      const monetization = buildMonetizationProjection(userRecords);

      return {
        userId: latestRecord.userId,
        userDisplayName: latestRecord.userDisplayName,
        username: latestRecord.username,
        isAnonymousUser: latestRecord.isAnonymousUser,
        usageCount: userRecords.length,
        totalCreditsUsed,
        usageSharePercent: roundUsageShare((userRecords.length / totalUsageEvents) * 100),
        topServiceTitle: perService[0]?.serviceTitle ?? latestRecord.serviceTitle,
        lastUsedAtLabel: formatUsageTimestamp(latestRecord.createdAt),
        projectedCustomerValueCredits: monetization.estimatedGrossCredits,
        perService,
        monetization,
      } satisfies EdenUserUsageBreakdown;
    })
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return right.projectedCustomerValueCredits - left.projectedCustomerValueCredits;
    });
}

function buildUserServiceBreakdowns(records: EdenResolvedUsageRecord[]) {
  const groupedRecords = groupUsageRecords(records, (record) => record.serviceId);

  return Array.from(groupedRecords.values())
    .map((serviceRecords) => {
      const latestRecord = serviceRecords[0];
      const totalCreditsUsed = serviceRecords.reduce(
        (total, record) => total + record.creditsUsed,
        0,
      );

      return {
        serviceId: latestRecord.serviceId,
        serviceTitle: latestRecord.serviceTitle,
        businessId: latestRecord.businessId,
        businessName: latestRecord.businessName,
        usageCount: serviceRecords.length,
        totalCreditsUsed,
        lastUsedAtLabel: formatUsageTimestamp(latestRecord.createdAt),
        projectedCustomerValueCredits: buildMonetizationProjection(serviceRecords)
          .estimatedGrossCredits,
      } satisfies EdenUserUsageServiceBreakdown;
    })
    .sort((left, right) => {
      if (right.usageCount !== left.usageCount) {
        return right.usageCount - left.usageCount;
      }

      return right.projectedCustomerValueCredits - left.projectedCustomerValueCredits;
    });
}

function buildUserConcentration(
  records: EdenResolvedUsageRecord[],
  topUsers: EdenUserUsageBreakdown[],
): EdenUserUsageConcentration {
  const totalUsageEvents = records.length || 1;
  const topThreeUsageEvents = topUsers
    .slice(0, 3)
    .reduce((total, user) => total + user.usageCount, 0);

  return {
    distinctUsers: topUsers.length,
    anonymousUsageEvents: records.filter((record) => record.isAnonymousUser).length,
    topUserSharePercent: topUsers[0]?.usageSharePercent ?? 0,
    topThreeUsersSharePercent: roundUsageShare(
      (topThreeUsageEvents / totalUsageEvents) * 100,
    ),
  };
}

function buildMonetizationProjection(
  records: EdenResolvedUsageRecord[],
): EdenUsageMonetizationProjection {
  const estimatedGrossCredits = records.reduce(
    (total, record) =>
      total +
      (record.grossCredits ??
        resolveUsageGrossCredits(
          {
            pricePerUse: record.pricePerUseCredits,
            pricingType: record.pricingType,
            pricingUnit: record.pricingUnit,
            pricingModel: record.pricingModel,
          },
          record.creditsUsed,
        )),
    0,
  );
  const estimatedPlatformEarningsCredits = records.reduce(
    (total, record) =>
      total +
      (record.platformFeeCredits ??
        calculatePlatformFeeCredits(
          record.grossCredits ??
            resolveUsageGrossCredits(
              {
                pricePerUse: record.pricePerUseCredits,
                pricingType: record.pricingType,
                pricingUnit: record.pricingUnit,
                pricingModel: record.pricingModel,
              },
              record.creditsUsed,
            ),
          edenPlatformFeeRate,
        )),
    0,
  );
  const missingStoredPricingCount = records.filter(
    (record) => record.pricePerUseCredits === null || record.pricePerUseCredits === undefined,
  ).length;
  const pricingRuleLabel =
    missingStoredPricingCount > 0
      ? `Gross earnings use each service's current stored per-use price when available. Eden keeps a 15% fee share. ${missingStoredPricingCount} tracked run${missingStoredPricingCount === 1 ? "" : "s"} currently fall back to the recorded usage Leaf’s because a service price has not been set yet.`
      : "Gross earnings use each service's current stored per-use price. Eden keeps a 15% fee share and the builder keeps the remainder.";

  return {
    estimatedGrossCredits,
    estimatedPlatformEarningsCredits,
    estimatedBuilderEarningsCredits:
      estimatedGrossCredits - estimatedPlatformEarningsCredits,
    pricingRuleLabel,
  };
}

function mapUsageRecordToEvent(record: EdenResolvedUsageRecord): EdenServiceUsageEvent {
  return {
    id: record.id,
    serviceId: record.serviceId,
    serviceTitle: record.serviceTitle,
    businessId: record.businessId,
    businessName: record.businessName,
    userId: record.userId,
    userDisplayName: record.userDisplayName,
    username: record.username,
    usageType: record.usageType,
    creditsUsed: record.creditsUsed,
    estimatedGrossCredits:
      record.grossCredits ??
      resolveUsageGrossCredits(
        {
          pricePerUse: record.pricePerUseCredits,
          pricingType: record.pricingType,
          pricingUnit: record.pricingUnit,
          pricingModel: record.pricingModel,
        },
        record.creditsUsed,
      ),
    platformFeeCredits:
      record.platformFeeCredits ??
      calculatePlatformFeeCredits(
        record.grossCredits ??
          resolveUsageGrossCredits(
            {
              pricePerUse: record.pricePerUseCredits,
              pricingType: record.pricingType,
              pricingUnit: record.pricingUnit,
              pricingModel: record.pricingModel,
            },
            record.creditsUsed,
          ),
        edenPlatformFeeRate,
      ),
    builderEarningsCredits:
      record.builderEarningsCredits ??
      ((record.grossCredits ??
        resolveUsageGrossCredits(
          {
            pricePerUse: record.pricePerUseCredits,
            pricingType: record.pricingType,
            pricingUnit: record.pricingUnit,
            pricingModel: record.pricingModel,
          },
          record.creditsUsed,
        )) -
        (record.platformFeeCredits ??
          calculatePlatformFeeCredits(
            record.grossCredits ??
              resolveUsageGrossCredits(
                {
                  pricePerUse: record.pricePerUseCredits,
                  pricingType: record.pricingType,
                  pricingUnit: record.pricingUnit,
                  pricingModel: record.pricingModel,
                },
                record.creditsUsed,
              ),
            edenPlatformFeeRate,
          ))),
    timestampLabel: formatUsageTimestamp(record.createdAt),
    source: record.source,
  };
}

function resolveUsageUserMeta(
  userId: string | null | undefined,
  userLookup: Map<string, { displayName: string; username: string }>,
) {
  if (!userId) {
    return {
      userId: null,
      userDisplayName: "Guest wallet",
      username: null,
      isAnonymousUser: true,
    };
  }

  const user = userLookup.get(userId);

  if (!user) {
    return {
      userId,
      userDisplayName: "Unknown user",
      username: null,
      isAnonymousUser: false,
    };
  }

  return {
    userId,
    userDisplayName: user.displayName,
    username: user.username,
    isAnonymousUser: false,
  };
}

function groupUsageRecords(
  records: EdenResolvedUsageRecord[],
  getKey: (record: EdenResolvedUsageRecord) => string,
) {
  return records.reduce((groups, record) => {
    const key = getKey(record);
    const currentGroup = groups.get(key) ?? [];

    groups.set(key, [...currentGroup, record]);
    return groups;
  }, new Map<string, EdenResolvedUsageRecord[]>());
}

function resolveCurrentUsagePricing(records: EdenResolvedUsageRecord[]) {
  return (
    records.find(
      (record) =>
        typeof record.pricePerUseCredits === "number" && record.pricePerUseCredits > 0,
    ) ?? records[0]
  );
}

function roundUsageShare(value: number) {
  return Math.round(value * 10) / 10;
}

function formatUsageTimestamp(createdAt: Date) {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    return "Tracked in mock mode";
  }

  const deltaMs = Date.now() - createdAt.getTime();

  if (deltaMs < 90_000) {
    return "Just now";
  }

  if (deltaMs < 3_600_000) {
    return `${Math.max(1, Math.round(deltaMs / 60_000))} min ago`;
  }

  if (deltaMs < 86_400_000) {
    return createdAt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return createdAt.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function logServiceUsageFailure(operation: string, error: unknown) {
  if (process.env.EDEN_LOG_DUAL_WRITE !== "true") {
    return;
  }

  const message =
    error instanceof Error ? error.message : "Unknown ServiceUsage persistence error";

  console.warn(
    `[eden-service-usage] Falling back during ${operation}. Mock behavior remains authoritative. ${message}`,
  );
}
