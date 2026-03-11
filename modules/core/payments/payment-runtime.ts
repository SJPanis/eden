import {
  formatLeaves,
} from "@/modules/core/credits/eden-currency";

export type EdenCreditsTopUpMode = "mock_only" | "hybrid" | "payment_only";

export type EdenCreditsTopUpPackage = {
  id: string;
  packLabel: string;
  creditsAmount: number;
  amountCents: number;
  currency: string;
  providerLabel: string;
  title: string;
  detail: string;
  chargeLabel: string;
  leavesPerDollar: number;
};

const supportedCreditsTopUpModes = new Set<EdenCreditsTopUpMode>([
  "mock_only",
  "hybrid",
  "payment_only",
]);

const baseCreditsTopUpPackages = [
  {
    id: "credits-250",
    packLabel: "Starter",
    creditsAmount: 250,
    amountCents: 1000,
    title: "250 Leaf’s",
    detail: "Best for lightweight discovery and a few priced service runs.",
  },
  {
    id: "credits-1000",
    packLabel: "Balanced",
    creditsAmount: 1000,
    amountCents: 3500,
    title: "1000 Leaf’s",
    detail: "Best for repeat consumer usage and steady marketplace exploration.",
  },
  {
    id: "credits-2500",
    packLabel: "High Balance",
    creditsAmount: 2500,
    amountCents: 8000,
    title: "2500 Leaf’s",
    detail: "Best for heavy testing, business scouting, and repeated high-value service use.",
  },
] as const;

function getRuntimeValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function hasStripeTopUpRuntimeConfig() {
  return Boolean(
    getRuntimeValue("STRIPE_SECRET_KEY") &&
      getRuntimeValue("STRIPE_WEBHOOK_SECRET"),
  );
}

export function resolveCreditsTopUpMode(): EdenCreditsTopUpMode {
  const rawMode =
    getRuntimeValue("NEXT_PUBLIC_EDEN_CREDITS_TOPUP_MODE") ??
    getRuntimeValue("EDEN_CREDITS_TOPUP_MODE") ??
    null;

  if (!rawMode) {
    return hasStripeTopUpRuntimeConfig() ? "hybrid" : "mock_only";
  }

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
    leavesPerDollar: pkg.creditsAmount / (pkg.amountCents / 100),
  }));
}

export function getDefaultCreditsTopUpPackage() {
  return getCreditsTopUpPackages()[0];
}

export function findCreditsTopUpPackage(packageId?: string | null) {
  if (!packageId) {
    return null;
  }

  return getCreditsTopUpPackages().find((pkg) => pkg.id === packageId) ?? null;
}

export function resolveCreditsTopUpPackage(packageId?: string | null) {
  return findCreditsTopUpPackage(packageId) ?? getDefaultCreditsTopUpPackage();
}

export function formatCreditsTopUpChargeLabel(packageId?: string | null) {
  return resolveCreditsTopUpPackage(packageId).chargeLabel;
}

export function getCreditsTopUpAnchorPackage() {
  return getDefaultCreditsTopUpPackage();
}

export function convertAnchorPackCentsToLeaves(amountCents: number) {
  const anchorPackage = getCreditsTopUpAnchorPackage();
  const centsPerLeaf = anchorPackage.amountCents / anchorPackage.creditsAmount;

  if (!Number.isFinite(amountCents) || amountCents <= 0 || !Number.isFinite(centsPerLeaf)) {
    return 0;
  }

  return Math.max(1, Math.ceil(amountCents / centsPerLeaf));
}

export function formatCurrencyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}
