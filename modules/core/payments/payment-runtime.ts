import {
  formatLeaves,
} from "@/modules/core/credits/eden-currency";

export type EdenCreditsTopUpMode = "mock_only" | "hybrid" | "payment_only";

export type EdenCreditsTopUpPackage = {
  id: string;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
  title: string;
  detail: string;
  chargeLabel: string;
};

const supportedCreditsTopUpModes = new Set<EdenCreditsTopUpMode>([
  "mock_only",
  "hybrid",
  "payment_only",
]);

const baseCreditsTopUpPackages = [
  {
    id: "credits-250",
    creditsAmount: 250,
    amountCents: 1000,
    title: "250 Leaves",
    detail: "Best for lightweight discovery and a few priced service runs.",
  },
  {
    id: "credits-1000",
    creditsAmount: 1000,
    amountCents: 3500,
    title: "1000 Leaves",
    detail: "Best for repeat consumer usage and steady marketplace exploration.",
  },
  {
    id: "credits-2500",
    creditsAmount: 2500,
    amountCents: 8000,
    title: "2500 Leaves",
    detail: "Best for heavy testing, business scouting, and repeated high-value service use.",
  },
] as const;

function getRuntimeValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function resolveCreditsTopUpMode(): EdenCreditsTopUpMode {
  const rawMode =
    getRuntimeValue("NEXT_PUBLIC_EDEN_CREDITS_TOPUP_MODE") ??
    getRuntimeValue("EDEN_CREDITS_TOPUP_MODE") ??
    "mock_only";

  return supportedCreditsTopUpModes.has(rawMode as EdenCreditsTopUpMode)
    ? (rawMode as EdenCreditsTopUpMode)
    : "mock_only";
}

export function isMockCreditsTopUpEnabled(mode = resolveCreditsTopUpMode()) {
  return mode === "mock_only" || mode === "hybrid";
}

export function isPaymentBackedCreditsTopUpEnabled(
  mode = resolveCreditsTopUpMode(),
) {
  return mode === "hybrid" || mode === "payment_only";
}

export function getCreditsTopUpPackages(): EdenCreditsTopUpPackage[] {
  const currency = (
    getRuntimeValue("NEXT_PUBLIC_EDEN_STRIPE_TOPUP_CURRENCY") ??
    getRuntimeValue("EDEN_STRIPE_TOPUP_CURRENCY") ??
    "usd"
  ).toLowerCase();

  return baseCreditsTopUpPackages.map((pkg) => ({
    ...pkg,
    currency,
    providerLabel: "Stripe Checkout",
    chargeLabel: `${formatCurrencyAmount(pkg.amountCents, currency)} for ${formatLeaves(pkg.creditsAmount)}`,
  }));
}

export function getDefaultCreditsTopUpPackage() {
  return getCreditsTopUpPackages()[0];
}

export function resolveCreditsTopUpPackage(packageId?: string | null) {
  const packages = getCreditsTopUpPackages();

  if (!packageId) {
    return packages[0];
  }

  return packages.find((pkg) => pkg.id === packageId) ?? packages[0];
}

export function formatCreditsTopUpChargeLabel(packageId?: string | null) {
  return resolveCreditsTopUpPackage(packageId).chargeLabel;
}

export function formatCurrencyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}
