import type { EdenAiIdeaResult } from "@/modules/eden-ai/types";

type AskEdenIdeaResultCardProps = {
  idea: EdenAiIdeaResult;
  isSelected: boolean;
  onSelect: () => void;
  onAction: () => void;
};

export function AskEdenIdeaResultCard({
  idea,
  isSelected,
  onSelect,
  onAction,
}: AskEdenIdeaResultCardProps) {
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
        <h4 className="text-sm font-semibold text-eden-ink">{idea.title}</h4>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isSelected ? "bg-eden-ink text-white" : "bg-eden-bg text-eden-muted"
          }`}
        >
          {isSelected ? "Selected" : "Idea"}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-eden-muted">{idea.description}</p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onAction();
        }}
        className="mt-4 inline-flex items-center rounded-xl border border-eden-edge bg-white px-3 py-2 text-xs font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-eden-bg"
      >
        {idea.actionLabel}
      </button>
    </article>
  );
}
