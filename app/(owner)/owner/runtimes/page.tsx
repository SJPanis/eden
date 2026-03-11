import Link from "next/link";
import {
  loadOwnerInternalSandboxTaskState,
  loadOwnerProjectRuntimeRegistryState,
} from "@/modules/core/services";
import { layerAccessRules } from "@/modules/core/session/mock-session";
import { requireMockAccess } from "@/modules/core/session/server";
import { OwnerRuntimeRegistry } from "@/ui/owner/owner-runtime-registry";

export default async function OwnerRuntimesPage() {
  await requireMockAccess(layerAccessRules.owner ?? [], "/owner/runtimes");
  const [registry, sandboxTaskState] = await Promise.all([
    loadOwnerProjectRuntimeRegistryState(),
    loadOwnerInternalSandboxTaskState(),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-eden-edge bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">
              Runtime control plane
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-eden-ink">
              Eden project runtime registry
            </h1>
            <p className="mt-3 text-sm leading-6 text-eden-muted">
              Owner-only control surface for runtime metadata. This page registers and
              inspects project runtimes as control-plane records only. It does not claim
              that isolated containers, previews, or managed deployments already exist.
            </p>
          </div>
          <Link
            href="/owner"
            className="rounded-full border border-eden-edge bg-eden-bg px-4 py-2 text-sm font-semibold text-eden-ink transition-colors hover:border-eden-ring hover:bg-white"
          >
            Return to Control Room
          </Link>
        </div>
      </div>

      <OwnerRuntimeRegistry
        initialRuntimes={registry.runtimes}
        initialUnavailableReason={registry.unavailableReason}
        initialSandboxTasks={sandboxTaskState.tasks}
        initialSandboxTaskUnavailableReason={sandboxTaskState.unavailableReason}
      />
    </div>
  );
}
