export type EdenCreditsTopUpMode = "mock_only" | "hybrid" | "payment_only";

const supportedCreditsTopUpModes = new Set<EdenCreditsTopUpMode>([
  "mock_only",
  "hybrid",
  "payment_only",
]);

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

export function getCreditsTopUpOffer() {
  const creditsAmount = parsePositiveInteger(
    getRuntimeValue("NEXT_PUBLIC_EDEN_STRIPE_TOPUP_CREDITS") ??
      getRuntimeValue("EDEN_STRIPE_TOPUP_CREDITS"),
    250,
  );
  const amountCents = parsePositiveInteger(
    getRuntimeValue("NEXT_PUBLIC_EDEN_STRIPE_TOPUP_AMOUNT_CENTS") ??
      getRuntimeValue("EDEN_STRIPE_TOPUP_AMOUNT_CENTS"),
    1000,
  );
  const currency = (
    getRuntimeValue("NEXT_PUBLIC_EDEN_STRIPE_TOPUP_CURRENCY") ??
    getRuntimeValue("EDEN_STRIPE_TOPUP_CURRENCY") ??
    "usd"
  ).toLowerCase();

  return {
    creditsAmount,
    amountCents,
    currency,
    providerLabel: "Stripe Checkout",
  };
}

export function formatCreditsTopUpChargeLabel() {
  const offer = getCreditsTopUpOffer();

  return `${formatCurrencyAmount(offer.amountCents, offer.currency)} for ${offer.creditsAmount.toLocaleString()} credits`;
}

export function formatCurrencyAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function parsePositiveInteger(rawValue: string | null, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
