export type EdenServiceAffordabilityTone = "ready" | "warning" | "neutral";

type EdenServiceAffordabilityDetails = {
  label: string;
  hint: string;
  tone: EdenServiceAffordabilityTone;
  nextStep: string;
};

function formatCreditsValue(value: number) {
  return `${value.toLocaleString()} credits`;
}

export function getServiceAffordabilityDetails(
  pricePerUseCredits: number | null,
  currentBalanceCredits: number,
): EdenServiceAffordabilityDetails {
  if (pricePerUseCredits === null) {
    return {
      label: "Wallet check on detail page",
      hint: "Open the service to confirm the current visible run price before you decide.",
      tone: "neutral",
      nextStep: "Open Service to confirm the current run price",
    };
  }

  if (currentBalanceCredits >= pricePerUseCredits) {
    return {
      label: "Enough credits",
      hint: `Your wallet already covers one run at ${formatCreditsValue(pricePerUseCredits)}.`,
      tone: "ready",
      nextStep: "Open Service and run with visible pricing",
    };
  }

  return {
    label: "Needs top-up",
    hint: `Short by ${formatCreditsValue(pricePerUseCredits - currentBalanceCredits)} before the first run.`,
    tone: "warning",
    nextStep: "Add credits, then open the service",
  };
}
