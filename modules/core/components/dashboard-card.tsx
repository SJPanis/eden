import type { ReactNode } from "react";

type DashboardCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function DashboardCard({
  eyebrow,
  title,
  description,
  children,
}: DashboardCardProps) {
  return (
    <article className="rounded-xl border border-white/8 bg-white/80 p-4 md:p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/50">{description}</p>
      {children ? <div className="mt-4 text-sm text-white">{children}</div> : null}
    </article>
  );
}
