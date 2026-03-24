import Link from "next/link";
import { edenLaunchLabels } from "@/ui/consumer/components/service-affordability-shared";

type ServiceCardProps = {
  title: string;
  provider: string;
  category: string;
  availabilityLabel: string;
  pricingLabel: string;
  trustLabel: string;
  launchBadgeLabel: string;
  affordabilityLabel: string;
  affordabilityHint: string;
  affordabilityTone: "ready" | "warning" | "neutral";
  href: string;
  saved?: boolean;
};

export function ServiceCard({
  title,
  provider,
  category,
  availabilityLabel,
  pricingLabel,
  trustLabel,
  launchBadgeLabel,
  affordabilityLabel,
  affordabilityHint,
  affordabilityTone,
  href,
  saved = false,
}: ServiceCardProps) {
  return (
    <article
      className={`eden-shell min-h-[228px] min-w-[272px] snap-start p-4 ${
        affordabilityTone === "ready"
          ? "border-emerald-500/30 bg-[linear-gradient(145deg,rgba(236,253,245,0.9),rgba(255,255,255,0.98))]"
          : affordabilityTone === "warning"
            ? "border-amber-500/25 bg-[linear-gradient(145deg,rgba(255,251,235,0.92),rgba(255,255,255,0.98))]"
            : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
          Service
        </p>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
          {launchBadgeLabel}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/50">{provider}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#14989a]/15 px-2.5 py-1 text-xs text-white">
          {category}
        </span>
        <span className="rounded-full border border-white/8 bg-white/[0.06] px-2.5 py-1 text-xs text-white/50">
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.06] p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
          {edenLaunchLabels.visiblePricing}
        </p>
        <p className="mt-2 text-sm font-semibold text-white">{pricingLabel}</p>
        <p className="mt-2 text-xs leading-5 text-white/50">{trustLabel}</p>
        <div
          className={`mt-3 rounded-2xl border px-3 py-2 ${
            affordabilityTone === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : affordabilityTone === "warning"
                ? "border-amber-500/25 bg-amber-500/10"
                : "border-white/8 bg-white/[0.04]"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
            {affordabilityLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/50">{affordabilityHint}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-white/50">
          {saved ? "Saved" : edenLaunchLabels.creditsOnlyBilling}
        </span>
        <Link
          href={href}
          className="inline-flex rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]"
        >
          {edenLaunchLabels.openService}
        </Link>
      </div>
    </article>
  );
}
