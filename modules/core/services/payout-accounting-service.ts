import "server-only";

import type {
  EdenBusinessServiceUsageMetrics,
  EdenOwnerServiceUsageMetrics,
} from "@/modules/core/services/service-usage-service";
import {
  loadBusinessPayoutSettlementHistory,
  loadOwnerPayoutSettlementHistory,
  type EdenPayoutSettlementHistoryItem,
  type EdenPayoutSettlementHistorySummary,
} from "@/modules/core/services/payout-settlement-service";
import {
  loadBusinessInternalLeavesUsageHistory,
  loadOwnerInternalLeavesUsageHistory,
  type EdenInternalLeavesUsageHistoryItem,
  type EdenInternalLeavesUsageHistorySummary,
} from "@/modules/core/services/internal-leaves-usage-service";
import type { EdenReadServiceOptions } from "@/modules/core/services/read-service-types";

export const edenBuilderPayoutHoldbackRate = 0.1;

export type EdenPayoutStatusOverview = {
  pendingCount: number;
  settledCount: number;
  canceledCount: number;
  internalUseCount: number;
  pendingSettlementCredits: number;
  settledSettlementCredits: number;
  canceledSettlementCredits: number;
  internalUseCredits: number;
};

export type EdenPayoutAccountingSnapshot = {
  totalEarnedCredits: number;
  unpaidEarningsCredits: number;
  payoutReadyCredits: number;
  paidOutCredits: number;
  earnedLeavesUsedInternallyCredits: number;
  availableForInternalUseCredits: number;
  holdbackCredits: number;
  edenFeeShareCredits: number;
  pendingSettlementCredits: number;
  accountingRuleLabel: string;
  payoutStatusLabel: string;
  statusOverview: EdenPayoutStatusOverview;
};

export type EdenBusinessServicePayoutAccounting = {
  serviceId: string;
  serviceTitle: string;
  usageCount: number;
  totalCreditsUsed: number;
  lastUsedAtLabel: string;
  totalEarnedCredits: number;
  unpaidEarningsCredits: number;
  payoutReadyCredits: number;
  paidOutCredits: number;
  internalUseCredits: number;
  holdbackCredits: number;
  edenFeeShareCredits: number;
};

export type EdenBusinessPayoutAccountingSummary = EdenPayoutAccountingSnapshot & {
  businessId: string;
  source: "persistent" | "mock_fallback";
  historySource: "persistent" | "mock_fallback";
  internalUseHistorySource: "persistent" | "mock_fallback";
  perService: EdenBusinessServicePayoutAccounting[];
  payoutHistory: EdenPayoutSettlementHistoryItem[];
  internalUseHistory: EdenInternalLeavesUsageHistoryItem[];
};

export type EdenOwnerBusinessPayoutAccounting = {
  businessId: string;
  businessName: string;
  usageCount: number;
  totalCreditsUsed: number;
  lastUsedAtLabel: string;
  topServiceTitle: string;
  totalEarnedCredits: number;
  unpaidEarningsCredits: number;
  payoutReadyCredits: number;
  paidOutCredits: number;
  internalUseCredits: number;
  availableForInternalUseCredits: number;
  holdbackCredits: number;
  edenFeeShareCredits: number;
  pendingSettlementCredits: number;
};

export type EdenOwnerPayoutAccountingSummary = EdenPayoutAccountingSnapshot & {
  source: "persistent" | "mock_fallback";
  historySource: "persistent" | "mock_fallback";
  internalUseHistorySource: "persistent" | "mock_fallback";
  totalBuilderLiabilityCredits: number;
  totalPayoutReadyCredits: number;
  totalInternalUseCredits: number;
  topEarningBusinesses: EdenOwnerBusinessPayoutAccounting[];
  payoutHistory: EdenPayoutSettlementHistoryItem[];
  internalUseHistory: EdenInternalLeavesUsageHistoryItem[];
};

export async function buildBusinessPayoutAccountingSummary(
  usageMetrics: EdenBusinessServiceUsageMetrics,
  options: EdenReadServiceOptions = {},
): Promise<EdenBusinessPayoutAccountingSummary> {
  const [settlementHistory, internalUseHistory] = await Promise.all([
    loadBusinessPayoutSettlementHistory(usageMetrics.businessId, options),
    loadBusinessInternalLeavesUsageHistory(usageMetrics.businessId, options),
  ]);
  const baseSummary = buildPayoutAccountingSnapshot(
    usageMetrics.monetization.estimatedBuilderEarningsCredits,
    usageMetrics.monetization.estimatedPlatformEarningsCredits,
    settlementHistory,
    internalUseHistory,
  );

  return {
    businessId: usageMetrics.businessId,
    source: usageMetrics.source,
    historySource: settlementHistory.source,
    internalUseHistorySource: internalUseHistory.source,
    ...baseSummary,
    perService: buildBusinessPerServicePayoutAccounting(
      usageMetrics,
      baseSummary.paidOutCredits,
      baseSummary.earnedLeavesUsedInternallyCredits,
    ),
    payoutHistory: settlementHistory.history,
    internalUseHistory: internalUseHistory.history,
  };
}

export async function buildOwnerPayoutAccountingSummary(
  usageMetrics: EdenOwnerServiceUsageMetrics,
  options: EdenReadServiceOptions = {},
): Promise<EdenOwnerPayoutAccountingSummary> {
  const [settlementHistory, internalUseHistory] = await Promise.all([
    loadOwnerPayoutSettlementHistory(options),
    loadOwnerInternalLeavesUsageHistory(options),
  ]);
  const baseSummary = buildPayoutAccountingSnapshot(
    usageMetrics.monetization.estimatedBuilderEarningsCredits,
    usageMetrics.monetization.estimatedPlatformEarningsCredits,
    settlementHistory,
    internalUseHistory,
  );
  const settlementTotalsByBusiness = groupSettlementTotalsByBusiness(
    settlementHistory.history,
  );
  const internalUseTotalsByBusiness = groupInternalUseTotalsByBusiness(
    internalUseHistory.history,
  );

  const topEarningBusinesses = usageMetrics.topBusinesses
    .map((business) => {
      const businessSettlementSummary =
        settlementTotalsByBusiness.get(business.businessId) ??
        emptySettlementHistorySummary();
      const businessInternalUseSummary =
        internalUseTotalsByBusiness.get(business.businessId) ??
        emptyInternalLeavesUsageHistorySummary();
      const businessSummary = buildPayoutAccountingSnapshot(
        business.monetization.estimatedBuilderEarningsCredits,
        business.monetization.estimatedPlatformEarningsCredits,
        businessSettlementSummary,
        businessInternalUseSummary,
      );

      return {
        businessId: business.businessId,
        businessName: business.businessName,
        usageCount: business.usageCount,
        totalCreditsUsed: business.totalCreditsUsed,
        lastUsedAtLabel: business.lastUsedAtLabel,
        topServiceTitle: business.topServiceTitle,
        totalEarnedCredits: businessSummary.totalEarnedCredits,
        unpaidEarningsCredits: businessSummary.unpaidEarningsCredits,
        payoutReadyCredits: businessSummary.payoutReadyCredits,
        paidOutCredits: businessSummary.paidOutCredits,
        internalUseCredits: businessSummary.earnedLeavesUsedInternallyCredits,
        availableForInternalUseCredits: businessSummary.availableForInternalUseCredits,
        holdbackCredits: businessSummary.holdbackCredits,
        edenFeeShareCredits: businessSummary.edenFeeShareCredits,
        pendingSettlementCredits: businessSummary.pendingSettlementCredits,
      } satisfies EdenOwnerBusinessPayoutAccounting;
    })
    .sort((left, right) => {
      if (right.totalEarnedCredits !== left.totalEarnedCredits) {
        return right.totalEarnedCredits - left.totalEarnedCredits;
      }

      return right.payoutReadyCredits - left.payoutReadyCredits;
    });

  return {
    source: usageMetrics.source,
    historySource: settlementHistory.source,
    internalUseHistorySource: internalUseHistory.source,
    ...baseSummary,
    totalBuilderLiabilityCredits: baseSummary.unpaidEarningsCredits,
    totalPayoutReadyCredits: baseSummary.payoutReadyCredits,
    totalInternalUseCredits: baseSummary.earnedLeavesUsedInternallyCredits,
    topEarningBusinesses,
    payoutHistory: settlementHistory.history,
    internalUseHistory: internalUseHistory.history,
  };
}

function buildBusinessPerServicePayoutAccounting(
  usageMetrics: EdenBusinessServiceUsageMetrics,
  totalSettledCredits: number,
  totalInternalUseCredits: number,
) {
  let remainingSettledCredits = totalSettledCredits;
  let remainingInternalUseCredits = totalInternalUseCredits;

  return usageMetrics.perService.map((service) => {
    const accrued = service.monetization.estimatedBuilderEarningsCredits;
    const paidOutCredits = Math.min(accrued, remainingSettledCredits);
    remainingSettledCredits = Math.max(remainingSettledCredits - paidOutCredits, 0);
    const remainingAfterSettlement = Math.max(accrued - paidOutCredits, 0);
    const internalUseCredits = Math.min(
      remainingAfterSettlement,
      remainingInternalUseCredits,
    );
    remainingInternalUseCredits = Math.max(
      remainingInternalUseCredits - internalUseCredits,
      0,
    );
    const unpaidEarningsCredits = Math.max(
      remainingAfterSettlement - internalUseCredits,
      0,
    );
    const holdbackCredits =
      unpaidEarningsCredits > 0
        ? Math.min(
            unpaidEarningsCredits,
            Math.round(unpaidEarningsCredits * edenBuilderPayoutHoldbackRate),
          )
        : 0;
    const payoutReadyCredits = Math.max(unpaidEarningsCredits - holdbackCredits, 0);

    return {
      serviceId: service.serviceId,
      serviceTitle: service.serviceTitle,
      usageCount: service.usageCount,
      totalCreditsUsed: service.totalCreditsUsed,
      lastUsedAtLabel: service.lastUsedAtLabel,
      totalEarnedCredits: accrued,
      unpaidEarningsCredits,
      payoutReadyCredits,
      paidOutCredits,
      internalUseCredits,
      holdbackCredits,
      edenFeeShareCredits: service.monetization.estimatedPlatformEarningsCredits,
    } satisfies EdenBusinessServicePayoutAccounting;
  });
}

function buildPayoutAccountingSnapshot(
  totalEarnedCredits: number,
  edenFeeShareCredits: number,
  settlementHistory: EdenPayoutSettlementHistorySummary,
  internalUseHistory: EdenInternalLeavesUsageHistorySummary,
): EdenPayoutAccountingSnapshot {
  const paidOutCredits = Math.min(
    Math.max(totalEarnedCredits, 0),
    Math.max(settlementHistory.totalSettledCredits, 0),
  );
  const earnedLeavesUsedInternallyCredits = Math.min(
    Math.max(totalEarnedCredits - paidOutCredits, 0),
    Math.max(internalUseHistory.totalInternalUseCredits, 0),
  );
  const unpaidEarningsCredits = Math.max(
    totalEarnedCredits - paidOutCredits - earnedLeavesUsedInternallyCredits,
    0,
  );
  const holdbackCredits =
    unpaidEarningsCredits > 0
      ? Math.min(
          unpaidEarningsCredits,
          Math.round(unpaidEarningsCredits * edenBuilderPayoutHoldbackRate),
        )
      : 0;
  const payoutReadyCredits = Math.max(unpaidEarningsCredits - holdbackCredits, 0);

  return {
    totalEarnedCredits,
    unpaidEarningsCredits,
    payoutReadyCredits,
    paidOutCredits,
    earnedLeavesUsedInternallyCredits,
    availableForInternalUseCredits: unpaidEarningsCredits,
    holdbackCredits,
    edenFeeShareCredits,
    pendingSettlementCredits: settlementHistory.totalPendingCredits,
    accountingRuleLabel:
      "Payout accounting is still internal-only. Spendable Leaves fund service usage, earned Leaves accrue separately for builders, internal Eden-use records reduce the remaining earned balance, Eden fee share is tracked independently, and persistent payout settlement records reduce paid-out and unpaid balances without enabling real payout rails yet.",
    payoutStatusLabel: buildPayoutStatusLabel({
      unpaidEarningsCredits,
      payoutReadyCredits,
      paidOutCredits,
      pendingCount: settlementHistory.pendingCount,
      internalUseCount: internalUseHistory.internalUseCount,
    }),
    statusOverview: {
      pendingCount: settlementHistory.pendingCount,
      settledCount: settlementHistory.settledCount,
      canceledCount: settlementHistory.canceledCount,
      internalUseCount: internalUseHistory.internalUseCount,
      pendingSettlementCredits: settlementHistory.totalPendingCredits,
      settledSettlementCredits: settlementHistory.totalSettledCredits,
      canceledSettlementCredits: settlementHistory.totalCanceledCredits,
      internalUseCredits: internalUseHistory.totalInternalUseCredits,
    },
  };
}

function buildPayoutStatusLabel(input: {
  unpaidEarningsCredits: number;
  payoutReadyCredits: number;
  paidOutCredits: number;
  pendingCount: number;
  internalUseCount: number;
}) {
  if (input.pendingCount > 0) {
    return "Settlement queue active";
  }

  if (input.internalUseCount > 0 && input.payoutReadyCredits > 0) {
    return input.paidOutCredits > 0
      ? "Partially settled with internal Eden use"
      : "Accruing with internal Eden use";
  }

  if (input.unpaidEarningsCredits <= 0) {
    return input.paidOutCredits > 0
      ? "Fully settled"
      : "No builder earnings accrued yet";
  }

  if (input.payoutReadyCredits > 0) {
    return input.paidOutCredits > 0
      ? "Partially settled with payout-ready balance"
      : "Accruing with payout-ready balance";
  }

  return input.paidOutCredits > 0
    ? "Partially settled under reserve holdback"
    : "Accruing under reserve holdback";
}

function groupSettlementTotalsByBusiness(history: EdenPayoutSettlementHistoryItem[]) {
  return history.reduce((totals, item) => {
    const current = totals.get(item.businessId) ?? emptySettlementHistorySummary();

    if (item.status === "settled") {
      current.totalSettledCredits += item.amountCredits;
      current.settledCount += 1;
    } else if (item.status === "pending") {
      current.totalPendingCredits += item.amountCredits;
      current.pendingCount += 1;
    } else if (item.status === "canceled") {
      current.totalCanceledCredits += item.amountCredits;
      current.canceledCount += 1;
    }

    current.history.push(item);
    totals.set(item.businessId, current);
    return totals;
  }, new Map<string, EdenPayoutSettlementHistorySummary>());
}

function groupInternalUseTotalsByBusiness(history: EdenInternalLeavesUsageHistoryItem[]) {
  return history.reduce((totals, item) => {
    const current = totals.get(item.businessId) ?? emptyInternalLeavesUsageHistorySummary();
    current.totalInternalUseCredits += item.amountCredits;
    current.internalUseCount += 1;
    current.history.push(item);
    totals.set(item.businessId, current);
    return totals;
  }, new Map<string, EdenInternalLeavesUsageHistorySummary>());
}

function emptySettlementHistorySummary(): EdenPayoutSettlementHistorySummary {
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

function emptyInternalLeavesUsageHistorySummary(): EdenInternalLeavesUsageHistorySummary {
  return {
    source: "mock_fallback",
    totalInternalUseCredits: 0,
    internalUseCount: 0,
    history: [],
  };
}
