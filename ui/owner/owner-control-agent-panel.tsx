import {
  edenOwnerControlConstitution,
  loadEdenOwnerControlPlaneState,
} from "@/modules/core/agents/eden-owner-constitution";
import { edenProviderAdapterRegistry } from "@/modules/core/agents/eden-provider-adapters";

export async function OwnerControlAgentPanel() {
  const controlPlaneState = await loadEdenOwnerControlPlaneState();

  return (
    <section className="rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Control agent scaffold
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-eden-ink">
            Owner-aligned Eden control layer
          </h2>
          <p className="mt-3 text-sm leading-6 text-eden-muted">
            Eden now exposes the first supervisory control-agent scaffold. It reads
            canonical platform memory, follows approved directives, and remains
            bounded by runtime-policy and secret-boundary rules.
          </p>
        </div>
        <span className="rounded-full border border-eden-edge bg-eden-bg px-3 py-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
          {controlPlaneState.loadedAtLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        This is an owner-aligned constitutional scaffold only. Eden does not claim
        unrestricted autonomy, raw secret access, or live provider execution from
        this panel.
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Required control inputs
            </p>
            <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
              {controlPlaneState.inputs.length} tracked
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {controlPlaneState.inputs.map((input) => (
              <article
                key={input.id}
                className="rounded-2xl border border-eden-edge bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eden-ink">
                      {input.label}
                    </p>
                    <p className="mt-1 text-xs text-eden-muted">{input.repoPath}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                      input.status === "loaded"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {input.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-eden-muted">
                  {input.purpose}
                </p>
                {input.excerpt ? (
                  <p className="mt-3 text-sm text-eden-ink">{input.excerpt}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Owner constitution
            </p>
            <p className="mt-2 text-lg font-semibold text-eden-ink">
              {edenOwnerControlConstitution.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-eden-muted">
              {edenOwnerControlConstitution.summary}
            </p>
            <div className="mt-4 space-y-3">
              {edenOwnerControlConstitution.directives.map((directive) => (
                <div
                  key={directive.id}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <p className="text-sm font-semibold text-eden-ink">
                    {directive.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-eden-muted">
                    {directive.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
              Hard limits
            </p>
            <div className="mt-4 space-y-2">
              {edenOwnerControlConstitution.controlLimits.map((limit) => (
                <div
                  key={limit}
                  className="rounded-2xl border border-eden-edge bg-white px-3 py-2 text-sm text-eden-muted"
                >
                  {limit}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-eden-edge bg-eden-bg/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-eden-muted">
                Approved provider scaffolds
              </p>
              <span className="rounded-full border border-eden-edge bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-eden-muted">
                {edenProviderAdapterRegistry.length} registered
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {edenProviderAdapterRegistry.map((adapter) => (
                <article
                  key={adapter.providerKey}
                  className="rounded-2xl border border-eden-edge bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eden-ink">
                        {adapter.label}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-eden-muted">
                        {adapter.adapterStatusLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                        adapter.providerKey === "openai"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {adapter.providerKey === "openai"
                        ? "Owner sandbox live path"
                        : "No live calls"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-eden-muted">
                    {adapter.summary}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
