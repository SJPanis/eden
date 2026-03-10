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
          <p className="mt-2 text-sm leading-6 text-eden-muted">
            Choose a package before starting a mock or payment-backed wallet top-up.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
          {packages.length} options
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {packages.map((pkg, index) => {
          const isSelected = pkg.id === selectedPackageId;
          const creditsPerDollar = Math.round(pkg.creditsAmount / (pkg.amountCents / 100));
          const isBestValue = pkg.id === bestValuePackageId;
          const isRecommended = pkg.id === recommendedPackageId;
          const packageLabel =
            index === 0 ? "Starter" : index === packages.length - 1 ? "High balance" : "Balanced";

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelect(pkg.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-eden-ring bg-eden-accent-soft/70 shadow-[0_16px_32px_-24px_rgba(19,33,68,0.28)]"
                  : "border-eden-edge bg-white/88 hover:border-eden-ring hover:bg-eden-bg"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
                    {packageLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-eden-ink">{pkg.title}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {isBestValue ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Best value
                    </span>
                  ) : null}
                  {isRecommended ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      Recommended
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className="rounded-full border border-eden-ring bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-eden-ink">
                      Selected
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight text-eden-ink">
                {pkg.chargeLabel}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-eden-muted">
                About {creditsPerDollar} Leaves per $1
              </p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">{pkg.detail}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-eden-edge bg-white/88 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Current selection
            </p>
            <p className="mt-2 text-sm font-semibold text-eden-ink">{selectedPackage.title}</p>
            <p className="mt-1 text-xs text-eden-muted">{selectedPackage.chargeLabel}</p>
          </div>
          <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs text-eden-muted">
            Ready
          </span>
        </div>
            <p className="mt-3 text-sm leading-6 text-eden-muted">{selectedPackage.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPackage.id === bestValuePackageId ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Best value package
            </span>
          ) : null}
          {selectedPackage.id === recommendedPackageId ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              Recommended for most buyers
            </span>
          ) : null}
          <span className="rounded-full border border-eden-edge bg-eden-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-eden-muted">
            Selected for next top-up
          </span>
        </div>
      </div>
    </div>
  );
}
