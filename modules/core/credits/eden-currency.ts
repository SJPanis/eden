export const edenCurrencyName = "Eden Leafs";
export const edenCurrencyUnit = "Leafs";
export const edenSpendableLeavesLabel = "Spendable Leafs";
export const edenEarnedLeavesLabel = "Earned Leafs";
export const edenPlatformFeeLeavesLabel = "Eden fee Leafs";

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
    normalized.toLowerCase() === "leaf's" ||
    normalized.toLowerCase() === "eden leaves" ||
    normalized.toLowerCase() === "eden leaf's"
  ) {
    return edenCurrencyUnit;
  }

  return normalized;
}
