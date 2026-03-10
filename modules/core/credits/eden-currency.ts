export const edenCurrencyName = "Eden Leaves";
export const edenCurrencyUnit = "Leaves";
export const edenSpendableLeavesLabel = "Spendable Leaves";
export const edenEarnedLeavesLabel = "Earned Leaves";
export const edenPlatformFeeLeavesLabel = "Eden fee Leaves";

export function formatLeaves(value: number) {
  return `${value.toLocaleString()} ${edenCurrencyUnit}`;
}

export function formatLeavesAmountLabel(amountLabel: string) {
  return amountLabel.replace(/\bcredits?\b/gi, edenCurrencyUnit);
}

export function formatDisplayPricingUnit(pricingUnit?: string | null) {
  const normalized = pricingUnit?.trim();

  if (!normalized) {
    return edenCurrencyUnit;
  }

  if (
    normalized.toLowerCase() === "credits" ||
    normalized.toLowerCase() === "credit" ||
    normalized.toLowerCase() === "eden credits" ||
    normalized.toLowerCase() === "leaves" ||
    normalized.toLowerCase() === "leaf" ||
    normalized.toLowerCase() === "eden leaves"
  ) {
    return edenCurrencyUnit;
  }

  return normalized;
}
