import Link from "next/link";
import { roleMeta, type EdenRole } from "@/modules/core/config/role-nav";

type AccessDeniedPanelProps = {
  currentRole: EdenRole;
  targetPath: string;
  requiredRoles: EdenRole[];
  retryHref: string;
  homeHref: string;
};

export function AccessDeniedPanel({
  currentRole,
  targetPath,
  requiredRoles,
  retryHref,
  homeHref,
}: AccessDeniedPanelProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-eden-edge bg-[radial-gradient(circle_at_top_left,rgba(254,226,226,0.66),rgba(255,255,255,0.97)_52%,rgba(219,234,254,0.76))] p-5 md:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-accent">
          Access Control
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
          Access blocked for this session
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-eden-muted md:text-base">
          This route is protected by Eden&apos;s role-access layer. If you are using a local mock
          session, switch roles in the header before retrying.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <section className="rounded-[28px] border border-eden-edge bg-white/84 p-5 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Why you are seeing this
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-eden-muted">
            <p>
              Target route: <span className="font-semibold text-eden-ink">{targetPath}</span>
            </p>
            <p>
              Current role: <span className="font-semibold text-eden-ink">{roleMeta[currentRole].label}</span>
            </p>
            <p>
              Required role: <span className="font-semibold text-eden-ink">{requiredRoles.map((role) => roleMeta[role].label).join(" or ")}</span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={retryHref}
              className="rounded-xl border border-eden-ring bg-eden-accent-soft px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:bg-eden-accent-soft/70"
            >
              Retry Route
            </Link>
            <Link
              href={homeHref}
              className="rounded-xl border border-eden-edge bg-white px-4 py-2 text-sm font-medium text-eden-muted transition-colors hover:border-eden-ring hover:text-eden-ink"
            >
              Go to Active Role Home
            </Link>
          </div>
        </section>

        <aside className="rounded-[28px] border border-eden-edge bg-white/84 p-5 shadow-[0_18px_40px_-28px_rgba(19,33,68,0.28)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Local mode note
          </p>
          <p className="mt-4 text-sm leading-6 text-eden-muted">
            Production routes use real authentication and server-backed role checks. Local mock
            sessions can still be used for development-only testing.
          </p>
        </aside>
      </div>
    </div>
  );
}

