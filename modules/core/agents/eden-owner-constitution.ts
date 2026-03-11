import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export const edenOwnerControlConstitution = {
  title: "Eden Owner Control Constitution",
  version: "v1",
  summary:
    "Owner-aligned control doctrine for Eden supervisory agents. This layer governs scope, approved inputs, and hard limits without pretending to be a human owner clone.",
  directives: [
    {
      id: "alignment_to_canonical_state",
      title: "Align to canonical Eden state",
      detail:
        "Control agents must read Eden specs, current state, task queue, changelog, and approved directives before acting.",
    },
    {
      id: "no_runtime_boundary_bypass",
      title: "Do not bypass runtime boundaries",
      detail:
        "Control agents may coordinate runtime metadata and policy, but they cannot bypass runtime isolation or reach into project secrets by default.",
    },
    {
      id: "owner_aligned_not_owner_clone",
      title: "Owner aligned, not owner impersonation",
      detail:
        "The control agent follows approved doctrine and review limits. It is not an unrestricted stand-in for the human owner.",
    },
    {
      id: "verified_claims_only",
      title: "Verified claims only",
      detail:
        "Control agents must distinguish verified state from proposed or planned state and cannot claim provisioning or autonomy that does not exist.",
    },
  ],
  controlLimits: [
    "No unrestricted file or runtime mutation authority by default.",
    "No raw secret exposure in UI, logs, or control-agent summaries.",
    "No provider execution unless the runtime policy, secret boundary, and adapter layer all explicitly permit it.",
    "No runtime provisioning claims unless real infrastructure actions are implemented and verified.",
  ],
} as const;

const ownerControlInputDescriptors = [
  {
    id: "master_spec",
    label: "Master spec",
    repoPath: "eden-system/specs/EDEN_MASTER_SPEC.md",
    purpose: "Core Eden product definition and platform boundaries.",
  },
  {
    id: "project_isolation",
    label: "Project isolation model",
    repoPath: "eden-system/specs/PROJECT_ISOLATION_MODEL.md",
    purpose: "Separation between Eden Core metadata and project runtime execution.",
  },
  {
    id: "ai_orchestration",
    label: "AI orchestration model",
    repoPath: "eden-system/specs/AI_ORCHESTRATION_MODEL.md",
    purpose: "Scoped agent responsibilities and state-update contract.",
  },
  {
    id: "current_state",
    label: "Current state",
    repoPath: "eden-system/state/CURRENT_STATE.md",
    purpose: "Verified implementation snapshot and current blockers.",
  },
  {
    id: "task_queue",
    label: "Task queue",
    repoPath: "eden-system/state/TASK_QUEUE.md",
    purpose: "Approved near-term and later roadmap execution queue.",
  },
  {
    id: "self_work_queue",
    label: "Self-work queue",
    repoPath: "eden-system/state/EDEN_SELF_WORK_QUEUE.json",
    purpose: "Owner-approved Eden self-improvement queue for internal sandbox work.",
  },
  {
    id: "post_deploy_timeline",
    label: "Post-deploy timeline",
    repoPath: "eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md",
    purpose: "Canonical plan for what Eden should do after the current checkpoint is deployed.",
  },
  {
    id: "build_supervisor_spec",
    label: "Build supervisor spec",
    repoPath: "eden-system/specs/EDEN_BUILD_SUPERVISOR.md",
    purpose: "Decision rules, stop conditions, and packet contract for supervised build orchestration.",
  },
  {
    id: "build_supervisor_state",
    label: "Build supervisor state",
    repoPath: "eden-system/state/EDEN_BUILD_SUPERVISOR_STATE.json",
    purpose: "Durable supervisor progress, completed task ids, and packet-preparation state.",
  },
  {
    id: "codex_execution_packet",
    label: "Codex packet",
    repoPath: "eden-system/state/EDEN_CODEX_EXECUTION_PACKET.json",
    purpose: "Latest structured Codex execution packet prepared by the build supervisor.",
  },
  {
    id: "changelog",
    label: "Changelog",
    repoPath: "eden-system/logs/CHANGELOG_AGENT.md",
    purpose: "Session-by-session implementation history and verification record.",
  },
  {
    id: "owner_constitution",
    label: "Owner constitution",
    repoPath: "eden-system/specs/OWNER_CONTROL_CONSTITUTION.md",
    purpose: "Approved doctrine and control limits for future Eden supervisory agents.",
  },
] as const;

export type EdenOwnerControlInputSnapshot = {
  id: string;
  label: string;
  repoPath: string;
  purpose: string;
  status: "loaded" | "missing";
  excerpt: string | null;
};

export async function loadEdenOwnerControlPlaneState() {
  const inputs = await Promise.all(
    ownerControlInputDescriptors.map(async (descriptor) => {
      const absolutePath = path.join(process.cwd(), descriptor.repoPath);

      try {
        const content = await readFile(absolutePath, "utf8");
        const excerpt =
          content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0 && !line.startsWith("#")) ?? null;

        return {
          id: descriptor.id,
          label: descriptor.label,
          repoPath: descriptor.repoPath,
          purpose: descriptor.purpose,
          status: "loaded" as const,
          excerpt,
        } satisfies EdenOwnerControlInputSnapshot;
      } catch {
        return {
          id: descriptor.id,
          label: descriptor.label,
          repoPath: descriptor.repoPath,
          purpose: descriptor.purpose,
          status: "missing" as const,
          excerpt: null,
        } satisfies EdenOwnerControlInputSnapshot;
      }
    }),
  );

  return {
    constitution: edenOwnerControlConstitution,
    inputs,
    loadedAtLabel: new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
