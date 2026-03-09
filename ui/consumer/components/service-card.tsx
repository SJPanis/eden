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
          ? "border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.9),rgba(255,255,255,0.98))]"
          : affordabilityTone === "warning"
            ? "border-amber-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.92),rgba(255,255,255,0.98))]"
            : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
          Service
        </p>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
          {launchBadgeLabel}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-eden-ink">{title}</h3>
      <p className="mt-1 text-sm text-eden-muted">{provider}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-eden-accent-soft px-2.5 py-1 text-xs text-eden-ink">
          {category}
        </span>
        <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-xs text-eden-muted">
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-eden-edge bg-white/82 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
          {edenLaunchLabels.visiblePricing}
        </p>
        <p className="mt-2 text-sm font-semibold text-eden-ink">{pricingLabel}</p>
        <p className="mt-2 text-xs leading-5 text-eden-muted">{trustLabel}</p>
        <div
          className={`mt-3 rounded-2xl border px-3 py-2 ${
            affordabilityTone === "ready"
              ? "border-emerald-200 bg-emerald-50"
              : affordabilityTone === "warning"
                ? "border-amber-200 bg-amber-50"
                : "border-eden-edge bg-eden-bg/60"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eden-muted">
            {affordabilityLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-eden-muted">{affordabilityHint}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-eden-muted">
          {saved ? "Saved" : edenLaunchLabels.creditsOnlyBilling}
        </span>
        <Link
          href={href}
          className="inline-flex rounded-xl border border-eden-edge bg-white px-3 py-2 text-xs font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
        >
          {edenLaunchLabels.openService}
        </Link>
      </div>
    </article>
  );
}
