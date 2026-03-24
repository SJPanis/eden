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
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="border-l-2 border-[#14989a]/40 pl-3">
          <h2 className="text-base font-semibold tracking-tight text-white md:text-lg">{title}</h2>
          <p className="mt-0.5 text-sm text-white/45">{subtitle}</p>
        </div>
        {badgeLabel ? (
          <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-[11px] text-white/40">
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
