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
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.06] p-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eden-ring/40 ${
        isSelected
          ? "border-[#14989a]/50 bg-[#14989a]/15/45 shadow-[0_18px_40px_-24px_rgba(26,115,232,0.45)]"
          : "border-white/8 hover:-translate-y-0.5 hover:border-[#14989a]/50 hover:shadow-[0_18px_40px_-24px_rgba(19,33,68,0.35)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">{idea.title}</h4>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isSelected ? "bg-eden-ink text-white" : "bg-white/[0.04] text-white/50"
          }`}
        >
          {isSelected ? "Selected" : "Idea"}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/50">{idea.description}</p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
          onAction();
        }}
        className="mt-4 inline-flex items-center rounded-xl border border-white/8 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#14989a]/50 hover:bg-white/[0.04]"
      >
        {idea.actionLabel}
      </button>
    </article>
  );
}
