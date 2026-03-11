import type { EdenAiBusinessResult } from "@/modules/eden-ai/types";

type AskEdenBusinessResultCardProps = {
  business: EdenAiBusinessResult;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
};

export function AskEdenBusinessResultCard({
  business,
  isSelected,
  onSelect,
  onAction,
}: AskEdenBusinessResultCardProps) {
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
        <h4 className="text-sm font-semibold text-eden-ink">{business.name}</h4>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isSelected ? "bg-eden-ink text-white" : "bg-eden-bg text-eden-muted"
          }`}
        >
          {isSelected ? "Selected" : "Business"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {business.tags.map((tag) => (
          <span
            key={`${business.id}-${tag}`}
            className="rounded-full bg-eden-bg px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-eden-muted"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-eden-muted">{business.summary}</p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onAction();
        }}
        className="mt-4 inline-flex items-center rounded-xl border border-eden-edge bg-white px-3 py-2 text-xs font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
      >
        {business.actionLabel}
      </button>
    </article>
  );
}
