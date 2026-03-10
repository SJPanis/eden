import { formatLeaves } from "@/modules/core/credits/eden-currency";

export type EdenServiceAffordabilityTone = "ready" | "warning" | "neutral";

export const edenLaunchLabels = {
  openService: "Open Service",
  runService: "Run Service",
  addCredits: "Add Leaves",
  visiblePricing: "Visible pricing",
  creditsOnlyBilling: "Eden Leaves only",
  noHiddenCheckout: "No hidden checkout during service use.",
  consumerReadiness: "Consumer-facing readiness",
} as const;

type EdenServiceAffordabilityDetails = {
  label: string;
  hint: string;
  tone: EdenServiceAffordabilityTone;
  nextStep: string;
};

function formatCreditsValue(value: number) {
  return formatLeaves(value);
}

export function getLaunchAvailabilityLabel(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized.includes("publish")) {
    return "Published and available";
  }

  if (normalized.includes("ready")) {
    return "Ready for launch";
  }

  if (normalized.includes("testing")) {
    return "Testing only";
  }

  return "Preview only";
}

export function getLaunchBadgeLabel(
  status: string | null | undefined,
  hasStoredPrice: boolean,
) {
  const availabilityLabel = getLaunchAvailabilityLabel(status);

  if (availabilityLabel === "Published and available" && hasStoredPrice) {
    return "Published and priced";
  }

  if (availabilityLabel === "Published and available") {
    return "Published";
  }

  if (availabilityLabel === "Ready for launch" && hasStoredPrice) {
    return "Ready for launch";
  }

  if (hasStoredPrice) {
    return "Visible pricing set";
  }

  return "Preview only";
}

export function getCreditsOnlyTrustLabel(hasStoredPrice: boolean) {
  return hasStoredPrice
    ? `${edenLaunchLabels.creditsOnlyBilling} | ${edenLaunchLabels.noHiddenCheckout}`
    : `${edenLaunchLabels.creditsOnlyBilling} | visible price still pending`;
}

export function getServiceAffordabilityDetails(
  pricePerUseCredits: number | null,
  currentBalanceCredits: number,
): EdenServiceAffordabilityDetails {
  if (pricePerUseCredits === null) {
    return {
      label: "Price check on detail",
      hint: "Open the service to confirm the current visible run price before you decide.",
      tone: "neutral",
      nextStep: edenLaunchLabels.openService,
    };
  }

  if (currentBalanceCredits >= pricePerUseCredits) {
    return {
      label: "Ready now",
      hint: `Your wallet already covers one run at ${formatCreditsValue(pricePerUseCredits)}.`,
      tone: "ready",
      nextStep: `${edenLaunchLabels.openService}, then ${edenLaunchLabels.runService}`,
    };
  }

  return {
    label: "Needs top-up",
    hint: `Short by ${formatCreditsValue(pricePerUseCredits - currentBalanceCredits)} before the first run.`,
    tone: "warning",
    nextStep: `${edenLaunchLabels.addCredits}, then ${edenLaunchLabels.openService}`,
  };
}
