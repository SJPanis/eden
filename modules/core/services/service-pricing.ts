export const edenPlatformFeeRate = 0.15;
export const defaultServicePricingType = "per_use";
export const defaultServicePricingUnit = "credits";

export type EdenServicePricingInput = {
  pricePerUse?: number | string | null;
  pricingType?: string | null;
  pricingUnit?: string | null;
  pricingModel?: string | null;
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

  if (pricing.pricePerUseCredits === null) {
    return options.fallbackLabel ?? "Not priced yet";
  }

  const amountLabel = `${pricing.pricePerUseCredits.toLocaleString()} ${pricing.pricingUnit}`;
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

export function calculatePlatformFeeCredits(
  estimatedGrossCredits: number,
  feeRate = edenPlatformFeeRate,
) {
  return Math.round(estimatedGrossCredits * feeRate);
}


