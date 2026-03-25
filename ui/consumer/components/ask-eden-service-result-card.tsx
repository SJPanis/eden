import type { EdenAiServiceResult } from "@/modules/eden-ai/types";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";

type AskEdenServiceResultCardProps = {
  service: EdenAiServiceResult;
  availabilityLabel: string;
  pricingLabel: string;
  trustLabel: string;
  launchBadgeLabel: string;
  affordabilityLabel: string;
  affordabilityHint: string;
  affordabilityTone: "ready" | "warning" | "neutral";
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
};

export function AskEdenServiceResultCard({
  service,
  availabilityLabel,
  pricingLabel,
  trustLabel,
  launchBadgeLabel,
  affordabilityLabel,
  affordabilityHint,
  affordabilityTone,
  isSelected,
  onSelect,
  onAction,
}: AskEdenServiceResultCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.06] p-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eden-ring/40 ${
        isSelected
          ? "border-[#2dd4bf]/50 bg-[#2dd4bf]/15/45 shadow-[0_18px_40px_-24px_rgba(26,115,232,0.45)]"
          : affordabilityTone === "ready"
            ? "border-emerald-500/25 bg-[linear-gradient(145deg,rgba(16,185,129,0.06),rgba(13,31,48,0.4))] hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.15)]"
            : affordabilityTone === "warning"
              ? "border-amber-500/20 bg-[linear-gradient(145deg,rgba(245,158,11,0.06),rgba(13,31,48,0.4))] hover:-translate-y-0.5 hover:border-amber-500/35 hover:shadow-[0_8px_24px_-8px_rgba(245,158,11,0.12)]"
              : "border-white/8 hover:-translate-y-0.5 hover:border-[#2dd4bf]/50 hover:shadow-[0_18px_40px_-24px_rgba(19,33,68,0.35)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            {service.category}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-white">{service.title}</h4>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isSelected ? "bg-eden-ink text-white" : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {isSelected ? "Selected" : launchBadgeLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/50">
          {availabilityLabel}
        </span>
        <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/50">
          {edenLaunchLabels.creditsOnlyBilling}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-white/50">{service.description}</p>

      <div className="mt-3 rounded-2xl border border-[rgba(45,212,191,0.08)] bg-white/[0.03] p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
          {edenLaunchLabels.visiblePricing}
        </p>
        <p className="mt-2 text-xs font-semibold text-white">{pricingLabel}</p>
        <p className="mt-2 text-xs leading-5 text-white/50">{trustLabel}</p>
        <div
          className={`mt-3 rounded-2xl border px-3 py-2 ${
            affordabilityTone === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : affordabilityTone === "warning"
                ? "border-amber-500/25 bg-amber-500/10"
                : "border-[rgba(45,212,191,0.07)] bg-white/[0.025]"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            {affordabilityLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/50">{affordabilityHint}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onAction();
        }}
        className="mt-4 inline-flex items-center rounded-xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#2dd4bf]/50 hover:bg-white/[0.04]"
      >
        {edenLaunchLabels.openService}
      </button>
    </article>
  );
}
