import {
  edenOwnerControlConstitution,
  loadEdenOwnerControlPlaneState,
} from "@/modules/core/agents/eden-owner-constitution";
import { edenProviderAdapterRegistry } from "@/modules/core/agents/eden-provider-adapters";

export async function OwnerControlAgentPanel() {
  const controlPlaneState = await loadEdenOwnerControlPlaneState();

  return (
    <section className="rounded-[28px] border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
            Control agent scaffold
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Owner-aligned Eden control layer
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Eden now exposes the first supervisory control-agent scaffold. It reads
            canonical platform memory, follows approved directives, and remains
            bounded by runtime-policy and secret-boundary rules.
          </p>
        </div>
        <span className="rounded-full border border-[rgba(45,212,191,0.07)] bg-white/[0.025] px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/50">
          {controlPlaneState.loadedAtLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        This is an owner-aligned constitutional scaffold only. Eden does not claim
        unrestricted autonomy, raw secret access, or live provider execution from
        this panel.
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Required control inputs
            </p>
            <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
              {controlPlaneState.inputs.length} tracked
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {controlPlaneState.inputs.map((input) => (
              <article
                key={input.id}
                className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {input.label}
                    </p>
                    <p className="mt-1 text-xs text-white/50">{input.repoPath}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                      input.status === "loaded"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/25 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {input.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  {input.purpose}
                </p>
                {input.excerpt ? (
                  <p className="mt-3 text-sm text-white">{input.excerpt}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Owner constitution
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {edenOwnerControlConstitution.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/50">
              {edenOwnerControlConstitution.summary}
            </p>
            <div className="mt-4 space-y-3">
              {edenOwnerControlConstitution.directives.map((directive) => (
                <div
                  key={directive.id}
                  className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {directive.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {directive.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">
              Hard limits
            </p>
            <div className="mt-4 space-y-2">
              {edenOwnerControlConstitution.controlLimits.map((limit) => (
                <div
                  key={limit}
                  className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-3 py-2 text-sm text-white/50"
                >
                  {limit}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(45,212,191,0.07)] bg-white/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                Approved provider scaffolds
              </p>
              <span className="rounded-full border border-[rgba(45,212,191,0.09)] bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                {edenProviderAdapterRegistry.length} registered
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {edenProviderAdapterRegistry.map((adapter) => (
                <article
                  key={adapter.providerKey}
                  className="rounded-2xl border border-[rgba(45,212,191,0.09)] bg-white/[0.035] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {adapter.label}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/50">
                        {adapter.adapterStatusLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${
                        adapter.providerKey === "openai"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {adapter.providerKey === "openai"
                        ? "Owner sandbox live path"
                        : "No live calls"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/50">
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
