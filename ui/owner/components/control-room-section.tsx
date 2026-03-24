import type { ReactNode } from "react";

type ControlRoomSectionProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ControlRoomSection({
  id,
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: ControlRoomSectionProps) {
  return (
    <section
      id={id}
      className={`rounded-[28px] border border-white/8 bg-white/[0.05] p-4 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)] md:p-5 ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-eden-accent">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white md:text-xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
