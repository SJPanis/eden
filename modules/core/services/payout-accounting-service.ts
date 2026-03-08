import "server-only";

import type {
  EdenBusinessServiceUsageMetrics,
  EdenOwnerServiceUsageMetrics,
} from "@/modules/core/services/service-usage-service";

export const edenBuilderPayoutHoldbackRate = 0.1;

export type EdenPayoutAccountingSnapshot = {
  totalEarnedCredits: number;
  unpaidEarningsCredits: number;
  payoutReadyCredits: number;
  paidOutCredits: number;
  holdbackCredits: number;
  edenFeeShareCredits: number;
  accountingRuleLabel: string;
  payoutStatusLabel: string;
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
  holdbackCredits: number;
  edenFeeShareCredits: number;
};

export type EdenBusinessPayoutAccountingSummary = EdenPayoutAccountingSnapshot & {
  businessId: string;
  source: "persistent" | "mock_fallback";
  perService: EdenBusinessServicePayoutAccounting[];
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
  holdbackCredits: number;
  edenFeeShareCredits: number;
};

export type EdenOwnerPayoutAccountingSummary = EdenPayoutAccountingSnapshot & {
  source: "persistent" | "mock_fallback";
  totalBuilderLiabilityCredits: number;
  totalPayoutReadyCredits: number;
  topEarningBusinesses: EdenOwnerBusinessPayoutAccounting[];
};

export function buildBusinessPayoutAccountingSummary(
  usageMetrics: EdenBusinessServiceUsageMetrics,
): EdenBusinessPayoutAccountingSummary {
  const baseSummary = buildPayoutAccountingSnapshot(
    usageMetrics.monetization.estimatedBuilderEarningsCredits,
    usageMetrics.monetization.estimatedPlatformEarningsCredits,
  );

  return {
    businessId: usageMetrics.businessId,
    source: usageMetrics.source,
    ...baseSummary,
    perService: usageMetrics.perService.map((service) => {
      const serviceSummary = buildPayoutAccountingSnapshot(
        service.monetization.estimatedBuilderEarningsCredits,
        service.monetization.estimatedPlatformEarningsCredits,
      );

      return {
        serviceId: service.serviceId,
        serviceTitle: service.serviceTitle,
        usageCount: service.usageCount,
        totalCreditsUsed: service.totalCreditsUsed,
        lastUsedAtLabel: service.lastUsedAtLabel,
        totalEarnedCredits: serviceSummary.totalEarnedCredits,
        unpaidEarningsCredits: serviceSummary.unpaidEarningsCredits,
        payoutReadyCredits: serviceSummary.payoutReadyCredits,
        paidOutCredits: serviceSummary.paidOutCredits,
        holdbackCredits: serviceSummary.holdbackCredits,
        edenFeeShareCredits: serviceSummary.edenFeeShareCredits,
      } satisfies EdenBusinessServicePayoutAccounting;
    }),
  };
}

export function buildOwnerPayoutAccountingSummary(
  usageMetrics: EdenOwnerServiceUsageMetrics,
): EdenOwnerPayoutAccountingSummary {
  const baseSummary = buildPayoutAccountingSnapshot(
    usageMetrics.monetization.estimatedBuilderEarningsCredits,
    usageMetrics.monetization.estimatedPlatformEarningsCredits,
  );

  const topEarningBusinesses = usageMetrics.topBusinesses
    .map((business) => {
      const businessSummary = buildPayoutAccountingSnapshot(
        business.monetization.estimatedBuilderEarningsCredits,
        business.monetization.estimatedPlatformEarningsCredits,
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
        holdbackCredits: businessSummary.holdbackCredits,
        edenFeeShareCredits: businessSummary.edenFeeShareCredits,
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
    ...baseSummary,
    totalBuilderLiabilityCredits: baseSummary.unpaidEarningsCredits,
    totalPayoutReadyCredits: baseSummary.payoutReadyCredits,
    topEarningBusinesses,
  };
}

function buildPayoutAccountingSnapshot(
  totalEarnedCredits: number,
  edenFeeShareCredits: number,
): EdenPayoutAccountingSnapshot {
  const paidOutCredits = 0;
  const unpaidEarningsCredits = Math.max(totalEarnedCredits - paidOutCredits, 0);
  const holdbackCredits =
    totalEarnedCredits > 0
      ? Math.min(
          unpaidEarningsCredits,
          Math.round(totalEarnedCredits * edenBuilderPayoutHoldbackRate),
        )
      : 0;
  const payoutReadyCredits = Math.max(unpaidEarningsCredits - holdbackCredits, 0);

  return {
    totalEarnedCredits,
    unpaidEarningsCredits,
    payoutReadyCredits,
    paidOutCredits,
    holdbackCredits,
    edenFeeShareCredits,
    accountingRuleLabel:
      "Payout accounting is mock-only for now. Builder earnings accrue from priced usage, Eden fee share is tracked separately, and a 10% holdback stays in reserve until real payout settlement exists.",
    payoutStatusLabel:
      unpaidEarningsCredits <= 0
        ? "No builder earnings accrued yet"
        : payoutReadyCredits > 0
          ? "Accruing with payout-ready balance"
          : "Accruing under reserve holdback",
  };
}
