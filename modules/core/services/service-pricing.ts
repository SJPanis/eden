import { formatDisplayPricingUnit } from "@/modules/core/credits/eden-currency";
import { convertAnchorPackCentsToLeaves } from "@/modules/core/payments/payment-runtime";

export const edenPlatformFeeRate = 0.15;
export const defaultServicePricingType = "per_use";
export const defaultServicePricingUnit = "credits";
export const defaultUsageMeteringMarkupRate = 0.35;

export type EdenServicePricingInput = {
  pricePerUse?: number | string | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  pricingModel?: string | null;
};

export type EdenUsageMeteringInput = {
  providerCostCents?: number | null;
  infraBufferCents?: number | null;
  platformMarkupRate?: number | null;
  minimumChargeLeaves?: number | null;
};

export type EdenResolvedServicePricing = {
  pricePerUseCredits: number | null;
  pricingType: string;
  pricingUnit: string;
  pricingModel?: string | null;
  hasStoredPrice: boolean;
};

export function normalizePricePerUse(
  value: number | string | null | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized.replace(/,/g, ""));

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
}

export function resolveServicePricing(
  input: EdenServicePricingInput,
): EdenResolvedServicePricing {
  const pricePerUseCredits = normalizePricePerUse(input.pricePerUse);

  return {
    pricePerUseCredits,
    pricingType: input.pricingType?.trim() || defaultServicePricingType,
    pricingUnit: input.pricingUnit?.trim() || defaultServicePricingUnit,
    pricingModel: input.pricingModel?.trim() || undefined,
    hasStoredPrice: pricePerUseCredits !== null,
  };
}

export function formatServicePricingLabel(
  input: EdenServicePricingInput,
  options: {
    fallbackLabel?: string;
    includePricingModel?: boolean;
  } = {},
) {
  const pricing = resolveServicePricing(input);
  const displayPricingUnit = formatDisplayPricingUnit(pricing.pricingUnit);

  if (pricing.pricePerUseCredits === null) {
    return options.fallbackLabel ?? "Not priced yet";
  }

  const amountLabel = `${pricing.pricePerUseCredits.toLocaleString()} ${displayPricingUnit}`;
  const cadenceLabel =
    pricing.pricingType === "per_session" ? "per session" : "per use";

  if (options.includePricingModel && pricing.pricingModel) {
    return `${amountLabel} ${cadenceLabel} | ${pricing.pricingModel}`;
  }

  return `${amountLabel} ${cadenceLabel}`;
}

export function resolveUsageGrossCredits(
  pricing: EdenServicePricingInput,
  fallbackCreditsUsed: number,
) {
  return resolveServicePricing(pricing).pricePerUseCredits ?? fallbackCreditsUsed;
}

export function resolveMeteredUsageChargeLeaves(
  metering: EdenUsageMeteringInput = {},
) {
  const providerCostCents = normalizePositiveWholeNumber(metering.providerCostCents);
  const infraBufferCents = normalizePositiveWholeNumber(metering.infraBufferCents);
  const minimumChargeLeaves = normalizePositiveWholeNumber(
    metering.minimumChargeLeaves,
  );
  const markupRate =
    typeof metering.platformMarkupRate === "number" &&
    Number.isFinite(metering.platformMarkupRate) &&
    metering.platformMarkupRate >= 0
      ? metering.platformMarkupRate
      : defaultUsageMeteringMarkupRate;
  const baseCostCents = providerCostCents + infraBufferCents;

  if (baseCostCents <= 0 && minimumChargeLeaves <= 0) {
    return null;
  }

  const meteredChargeLeaves =
    baseCostCents > 0
      ? convertAnchorPackCentsToLeaves(Math.ceil(baseCostCents * (1 + markupRate)))
      : 0;

  return Math.max(meteredChargeLeaves, minimumChargeLeaves);
}

export function resolveEffectiveUsageChargeLeaves(
  pricing: EdenServicePricingInput,
  fallbackCreditsUsed: number,
  metering: EdenUsageMeteringInput = {},
) {
  const resolvedPrice = resolveUsageGrossCredits(pricing, fallbackCreditsUsed);
  const meteredChargeLeaves = resolveMeteredUsageChargeLeaves(metering);

  if (meteredChargeLeaves === null) {
    return resolvedPrice;
  }

  return Math.max(resolvedPrice, meteredChargeLeaves);
}

export function formatServicePricingUnitLabel(pricingUnit?: string | null) {
  return formatDisplayPricingUnit(pricingUnit);
}

export function calculatePlatformFeeCredits(
  estimatedGrossCredits: number,
  feeRate = edenPlatformFeeRate,
) {
  return Math.round(estimatedGrossCredits * feeRate);
}

export function calculateBuilderEarningsCredits(
  estimatedGrossCredits: number,
  feeRate = edenPlatformFeeRate,
) {
  return Math.max(
    estimatedGrossCredits - calculatePlatformFeeCredits(estimatedGrossCredits, feeRate),
    0,
  );
}

export function buildUsageSettlementSnapshot(
  pricing: EdenServicePricingInput,
  fallbackCreditsUsed: number,
  metering: EdenUsageMeteringInput = {},
) {
  const grossCredits = resolveEffectiveUsageChargeLeaves(
    pricing,
    fallbackCreditsUsed,
    metering,
  );
  const platformFeeCredits = calculatePlatformFeeCredits(grossCredits, edenPlatformFeeRate);

  return {
    grossCredits,
    platformFeeCredits,
    builderEarningsCredits: calculateBuilderEarningsCredits(
      grossCredits,
      edenPlatformFeeRate,
    ),
  };
}

function normalizePositiveWholeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value);
}


