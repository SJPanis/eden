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
        {packages.map((pkg) => {
          const isSelected = pkg.id === selectedPackageId;

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelect(pkg.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-eden-ring bg-eden-accent-soft/70"
                  : "border-eden-edge bg-white/88 hover:border-eden-ring hover:bg-eden-bg"
              }`}
            >
              <p className="text-sm font-semibold text-eden-ink">{pkg.title}</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-eden-ink">
                {pkg.chargeLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-eden-muted">{pkg.detail}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
