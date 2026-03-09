"use client";

type OwnerReconciliationFilterOption = {
  value: string;
  label: string;
  count?: number;
};

type OwnerReconciliationFiltersProps = {
  ariaLabel: string;
  options: OwnerReconciliationFilterOption[];
  value: string;
  onChange: (value: string) => void;
};

export function OwnerReconciliationFilters({
  ariaLabel,
  options,
  value,
  onChange,
}: OwnerReconciliationFiltersProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              isActive
                ? "border-eden-ring bg-eden-ink text-white"
                : "border-eden-edge bg-white text-eden-ink hover:border-eden-ring hover:bg-eden-bg"
            }`}
            aria-pressed={isActive}
          >
            <span>{option.label}</span>
            {typeof option.count === "number" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  isActive ? "bg-white/20 text-white" : "bg-eden-bg text-eden-muted"
                }`}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
