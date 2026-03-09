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
          <h2 className="text-lg font-semibold tracking-tight text-eden-ink md:text-xl">{title}</h2>
          <p className="text-sm text-eden-muted">{subtitle}</p>
        </div>
        {badgeLabel ? (
          <span className="rounded-full border border-eden-edge bg-white/90 px-3 py-1 text-xs text-eden-muted">
            {badgeLabel}
          </span>
        ) : null}
      </div>

      {hasItems ? (
        children
      ) : (
        <div className="rounded-xl border border-dashed border-eden-edge bg-white/70 p-4 text-sm text-eden-muted">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
