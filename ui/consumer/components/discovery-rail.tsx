import type { ReactNode } from "react";

type DiscoveryRailProps = {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  hasItems: boolean;
  emptyMessage: string;
  children: ReactNode;
};

export function DiscoveryRail({
  title,
  subtitle,
  badgeLabel,
  hasItems,
  emptyMessage,
  children,
}: DiscoveryRailProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">{title}</h2>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
        {badgeLabel ? (
          <span className="rounded-full border border-white/8 bg-white/[0.06] px-3 py-1 text-xs text-white/50">
            {badgeLabel}
          </span>
        ) : null}
      </div>

      {hasItems ? (
        children
      ) : (
        <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.04] p-4 text-sm text-white/50">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
