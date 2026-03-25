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
    <article
      className="rounded-2xl p-4 md:p-5"
      style={{
        border: "1px solid rgba(45,212,191,0.1)",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/50">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-white/50">{description}</p>
      {children ? <div className="mt-4 text-sm text-white">{children}</div> : null}
    </article>
  );
}
