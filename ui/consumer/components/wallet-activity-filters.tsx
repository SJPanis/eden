"use client";

import type { EdenConsumerTransactionHistoryItem } from "@/modules/core/credits/mock-credits";

export type WalletActivityFilter = "all" | "topups" | "service_charges";

type WalletActivityFiltersProps = {
  value: WalletActivityFilter;
  onChange: (value: WalletActivityFilter) => void;
  counts?: Partial<Record<WalletActivityFilter, number>>;
};

const filterOptions: Array<{
  id: WalletActivityFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "topups", label: "Top-ups" },
  { id: "service_charges", label: "Service charges" },
];

export function WalletActivityFilters({
  value,
  onChange,
  counts,
}: WalletActivityFiltersProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {filterOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
            value === option.id
              ? "border-eden-ring bg-eden-accent-soft text-eden-ink"
              : "border-eden-edge bg-white text-eden-muted hover:border-eden-ring hover:text-eden-ink"
          }`}
        >
          {option.label}
          {typeof counts?.[option.id] === "number" ? (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                value === option.id
                  ? "bg-white/55 text-eden-ink"
                  : "bg-eden-bg text-eden-muted"
              }`}
            >
              {counts[option.id]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function filterWalletTransactions(
  transactions: EdenConsumerTransactionHistoryItem[],
  filter: WalletActivityFilter,
) {
  if (filter === "topups") {
    return transactions.filter((transaction) => transaction.kind === "wallet");
  }

  if (filter === "service_charges") {
    return transactions.filter((transaction) => transaction.kind === "usage");
  }

  return transactions;
}
