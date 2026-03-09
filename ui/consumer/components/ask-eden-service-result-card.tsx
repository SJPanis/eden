import type { EdenServiceResult } from "@/modules/eden-ai/eden-types";

type AskEdenServiceResultCardProps = {
  service: EdenServiceResult;
  availabilityLabel: string;
  pricingLabel: string;
  trustLabel: string;
  launchBadgeLabel: string;
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
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eden-ring/40 ${
        isSelected
          ? "border-eden-ring bg-eden-accent-soft/45 shadow-[0_18px_40px_-24px_rgba(26,115,232,0.45)]"
          : "border-eden-edge hover:-translate-y-0.5 hover:border-eden-ring hover:shadow-[0_18px_40px_-24px_rgba(19,33,68,0.35)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            {service.category}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-eden-ink">{service.title}</h4>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isSelected ? "bg-eden-ink text-white" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {isSelected ? "Selected" : launchBadgeLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-eden-muted">
          {availabilityLabel}
        </span>
        <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-eden-muted">
          Credits run
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-eden-muted">{service.description}</p>

      <div className="mt-3 rounded-2xl border border-eden-edge bg-white/80 p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-eden-muted">Visible pricing</p>
        <p className="mt-2 text-xs font-semibold text-eden-ink">{pricingLabel}</p>
        <p className="mt-2 text-xs leading-5 text-eden-muted">{trustLabel}</p>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onAction();
        }}
        className="mt-4 inline-flex items-center rounded-xl border border-eden-edge bg-white px-3 py-2 text-xs font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
      >
        View Service
      </button>
    </article>
  );
}
