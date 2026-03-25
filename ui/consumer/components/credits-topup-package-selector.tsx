"use client";

import type { EdenCreditsTopUpPackage } from "@/modules/core/payments/payment-runtime";

type CreditsTopUpPackageSelectorProps = {
  packages: EdenCreditsTopUpPackage[];
  selectedPackageId: string;
  onSelect(packageId: string): void;
};

export function CreditsTopUpPackageSelector({
  packages,
  selectedPackageId,
  onSelect,
}: CreditsTopUpPackageSelectorProps) {
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? packages[0];
  const recommendedPackageId = packages[Math.min(1, Math.max(packages.length - 1, 0))]?.id ?? null;
  const bestValuePackageId =
    packages.length > 0
      ? [...packages]
          .sort(
            (left, right) =>
              right.creditsAmount / (right.amountCents / 100) -
              left.creditsAmount / (left.amountCents / 100),
          )[0]?.id
      : null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-eden-accent">
            Top-up packages
          </p>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Choose a package before continuing to Stripe Checkout for a real Eden wallet top-up.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
          {packages.length} options
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {packages.map((pkg) => {
          const isSelected = pkg.id === selectedPackageId;
          const creditsPerDollar = pkg.leavesPerDollar.toFixed(
            Number.isInteger(pkg.leavesPerDollar) ? 0 : 1,
          );
          const isBestValue = pkg.id === bestValuePackageId;
          const isRecommended = pkg.id === recommendedPackageId;
          const packageLabel = pkg.packLabel;

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelect(pkg.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-[#2dd4bf]/50 bg-[#2dd4bf]/20 shadow-[0_16px_32px_-24px_rgba(19,33,68,0.28)]"
                  : "border-[rgba(45,212,191,0.09)] bg-white/[0.035] hover:border-[#2dd4bf]/50 hover:bg-white/[0.04]"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    {packageLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{pkg.title}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {isBestValue ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                      Best value
                    </span>
                  ) : null}
                  {isRecommended ? (
                    <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">
                      Recommended
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className="rounded-full border border-[#2dd4bf]/50 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Selected
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight text-white">
                {pkg.chargeLabel}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/50">
                About {creditsPerDollar} Leaf&apos;s per $1
              </p>
              <p className="mt-2 text-sm leading-6 text-white/50">{pkg.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Current selection
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{selectedPackage.title}</p>
            <p className="mt-1 text-xs text-white/50">{selectedPackage.chargeLabel}</p>
          </div>
          <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs text-white/50">
            Ready
          </span>
        </div>
            <p className="mt-3 text-sm leading-6 text-white/50">{selectedPackage.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPackage.id === bestValuePackageId ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
              Best value package
            </span>
          ) : null}
          {selectedPackage.id === recommendedPackageId ? (
            <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">
              Recommended for most buyers
            </span>
          ) : null}
          <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Selected for next top-up
          </span>
        </div>
      </div>
    </div>
  );
}



