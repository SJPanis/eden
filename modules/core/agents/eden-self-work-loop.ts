import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import {
  type EdenSelfWorkApprovalState,
  type EdenSelfWorkControlInputRecord,
  type EdenSelfWorkLane,
  type EdenSelfWorkLoopState,
  type EdenSelfWorkQueueRecord,
  type EdenSelfWorkQueueTaskLink,
} from "@/modules/core/agents/eden-self-work-shared";
import { loadEdenOwnerControlPlaneState } from "@/modules/core/agents/eden-owner-constitution";
import { edenOwnerInternalSandboxRuntimeId } from "@/modules/core/projects/project-runtime-shared";
import {
  createOwnerInternalSandboxTask,
  describeProjectRuntimeFailure,
} from "@/modules/core/services/project-runtime-service";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const edenSelfWorkQueuePath = "eden-system/state/EDEN_SELF_WORK_QUEUE.json";
const edenSelfWorkTimelinePath = "eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md";

type EdenSelfWorkQueueFile = {
  version: string;
  mode: "owner_review_required" | "continuous_with_review_gates";
  scope: {
    label: string;
    description: string;
  };
  queue: Array<{
    id: string;
    title: string;
    chapter: string;
    lane: EdenSelfWorkLane;
    approvalState: EdenSelfWorkApprovalState;
    summary: string;
    acceptanceCriteria: string[];
    blockedBy: string[];
    requiresOwnerReview: boolean;
  }>;
};

type EdenRuntimeTaskLookup = {
  id: string;
  title: string;
  inputText: string;
  status: string;
  workerSummary: string | null;
  failureDetail: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

type EdenSelfWorkActor = {
  id: string;
  username: string;
  displayName: string;
  role: "consumer" | "business" | "owner";
  status: string;
  edenBalanceCredits?: number;
};

export async function loadEdenSelfWorkState(): Promise<EdenSelfWorkLoopState> {
  try {
    const [queueFile, controlPlaneState] = await Promise.all([
      readEdenSelfWorkQueueFile(),
      loadEdenOwnerControlPlaneState(),
    ]);
    const prisma = getPrismaClient();
    const [runtime, runtimeTasks] = await Promise.all([
      prisma.projectRuntime.findUnique({
        where: {
          id: edenOwnerInternalSandboxRuntimeId,
        },
        select: {
          id: true,
          name: true,
          status: true,
          accessPolicy: true,
          runtimeType: true,
        },
      }),
      prisma.projectRuntimeTask.findMany({
        where: {
          runtimeId: edenOwnerInternalSandboxRuntimeId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          inputText: true,
          status: true,
          workerSummary: true,
          failureDetail: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    const inputs: EdenSelfWorkControlInputRecord[] = controlPlaneState.inputs.map((input) => ({
      id: input.id,
      label: input.label,
      repoPath: input.repoPath,
      status: input.status,
    }));
    const queue = mapEdenSelfWorkQueue(queueFile.queue, runtimeTasks);
    const missingInput = inputs.find((input) => input.status === "missing");
    const nextApproved = queue.find(
      (item) => item.approvalState === "approved" && !item.linkedTask,
    );
    const runtimeReady =
      runtime?.accessPolicy === "OWNER_ONLY" &&
      runtime.runtimeType === "INTERNAL_SANDBOX";

    let readinessLabel = "Blocked";
    let readinessDetail =
      "Owner review is still required before Eden can queue self-work inside the internal sandbox.";

    if (missingInput) {
      readinessDetail = `Control input missing: ${missingInput.repoPath}.`;
    } else if (!runtime) {
      readinessDetail =
        "Register the Eden Internal Sandbox Runtime before queueing self-work tasks.";
    } else if (!runtimeReady) {
      readinessDetail =
        "The internal sandbox runtime must remain owner-only and typed as INTERNAL_SANDBOX.";
    } else if (!nextApproved) {
      readinessLabel = "Waiting";
      readinessDetail =
        "No unqueued approved Eden self-work items are currently available.";
    } else {
      readinessLabel = "Ready";
      readinessDetail =
        "The owner-only sandbox can queue the next approved Eden self-work item into the runtime task registry.";
    }

    return {
      ready: readinessLabel === "Ready",
      readinessLabel,
      readinessDetail,
      reviewRequiredMode: queueFile.mode === "owner_review_required",
      reviewModeLabel:
        queueFile.mode === "owner_review_required"
          ? "Owner review required after each self-work task"
          : "Continuous with explicit review gates",
      scopeLabel: queueFile.scope.label,
      scopeDetail: queueFile.scope.description,
      queuePath: edenSelfWorkQueuePath,
      timelinePath: edenSelfWorkTimelinePath,
      sandboxRuntimeName: runtime?.name ?? null,
      sandboxRuntimeStatusLabel: runtime ? formatEnumLabel(runtime.status) : null,
      inputs,
      queue,
      unavailableReason: null,
    };
  } catch (error) {
    return {
      ready: false,
      readinessLabel: "Unavailable",
      readinessDetail:
        "Eden could not load the self-work control loop state from the current environment.",
      reviewRequiredMode: true,
      reviewModeLabel: "Owner review required after each self-work task",
      scopeLabel: "Eden core self-improvement only",
      scopeDetail:
        "Read canonical specs and queue one approved Eden-core task at a time inside the owner sandbox.",
      queuePath: edenSelfWorkQueuePath,
      timelinePath: edenSelfWorkTimelinePath,
      inputs: [],
      queue: [],
      unavailableReason: describeEdenSelfWorkFailure(error),
    };
  }
}

export async function queueNextApprovedEdenSelfWorkTask(actor: EdenSelfWorkActor) {
  try {
    const [state, queueFile, controlPlaneState, timelineExcerpt] = await Promise.all([
      loadEdenSelfWorkState(),
      readEdenSelfWorkQueueFile(),
      loadEdenOwnerControlPlaneState(),
      readEdenSelfWorkTimelineExcerpt(),
    ]);

    if (state.unavailableReason) {
      return {
        ok: false as const,
        status: 503,
        error: state.unavailableReason,
      };
    }

    if (!state.ready) {
      return {
        ok: false as const,
        status: 409,
        error: state.readinessDetail,
      };
    }

    const nextQueueItem = state.queue.find(
      (item) => item.approvalState === "approved" && !item.linkedTask,
    );

    if (!nextQueueItem) {
      return {
        ok: false as const,
        status: 409,
        error: "No approved Eden self-work item is ready to queue right now.",
      };
    }

    const queueItemDefinition = queueFile.queue.find(
      (item) => item.id === nextQueueItem.id,
    );

    if (!queueItemDefinition) {
      return {
        ok: false as const,
        status: 500,
        error: "The next Eden self-work item could not be resolved from the canonical queue.",
      };
    }

    const taskInput = buildEdenSelfWorkTaskInput({
      queueItem: queueItemDefinition,
      controlPlaneState,
      timelineExcerpt,
    });
    const result = await createOwnerInternalSandboxTask(actor, {
      title: buildEdenSelfWorkTaskTitle(queueItemDefinition.title, queueItemDefinition.id),
      inputText: taskInput,
    });

    if (!result.ok) {
      return result;
    }

    return {
      ok: true as const,
      queueItem: nextQueueItem,
      task: result.task,
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 503,
      error: describeEdenSelfWorkFailure(error),
    };
  }
}

async function readEdenSelfWorkQueueFile() {
  const absolutePath = path.join(process.cwd(), edenSelfWorkQueuePath);
  const content = await readFile(absolutePath, "utf8");
  return JSON.parse(content) as EdenSelfWorkQueueFile;
}

async function readEdenSelfWorkTimelineExcerpt() {
  const absolutePath = path.join(process.cwd(), edenSelfWorkTimelinePath);
  const content = await readFile(absolutePath, "utf8");
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("-")) ??
    "Keep Eden self-work inside the owner-approved sandbox and stop for review whenever the queue requires it."
  );
}

function mapEdenSelfWorkQueue(
  queue: EdenSelfWorkQueueFile["queue"],
  runtimeTasks: EdenRuntimeTaskLookup[],
): EdenSelfWorkQueueRecord[] {
  const nextApprovedId =
    queue.find(
      (item) =>
        item.approvalState === "approved" &&
        !findLinkedTask(item.id, runtimeTasks),
    )?.id ?? null;

  return queue.map((item) => {
    const linkedTask = findLinkedTask(item.id, runtimeTasks);

    return {
      id: item.id,
      title: item.title,
      chapter: item.chapter,
      lane: item.lane,
      laneLabel: formatLaneLabel(item.lane),
      approvalState: item.approvalState,
      approvalStateLabel: formatApprovalStateLabel(item.approvalState),
      summary: item.summary,
      acceptanceCriteria: item.acceptanceCriteria,
      blockedBy: item.blockedBy,
      requiresOwnerReview: item.requiresOwnerReview,
      isNextApproved: item.id === nextApprovedId,
      linkedTask: linkedTask ? mapLinkedTask(linkedTask) : null,
    };
  });
}

function findLinkedTask(queueItemId: string, tasks: EdenRuntimeTaskLookup[]) {
  const titlePrefix = `[eden-self-work:${queueItemId}]`;
  return tasks.find((task) => task.title.startsWith(titlePrefix)) ?? null;
}

function mapLinkedTask(task: EdenRuntimeTaskLookup): EdenSelfWorkQueueTaskLink {
  return {
    id: task.id,
    title: task.title,
    status: task.status.toLowerCase(),
    statusLabel: formatEnumLabel(task.status),
    createdAtLabel: formatTimestamp(task.createdAt),
    completedAtLabel: task.completedAt ? formatTimestamp(task.completedAt) : null,
    workerSummary: task.workerSummary,
    failureDetail: task.failureDetail,
  };
}

function buildEdenSelfWorkTaskTitle(title: string, queueItemId: string) {
  return `[eden-self-work:${queueItemId}] ${title}`;
}

function buildEdenSelfWorkTaskInput(input: {
  queueItem: EdenSelfWorkQueueFile["queue"][number];
  controlPlaneState: Awaited<ReturnType<typeof loadEdenOwnerControlPlaneState>>;
  timelineExcerpt: string;
}) {
  const loadedInputs = input.controlPlaneState.inputs
    .map((item) => {
      const excerpt = item.excerpt ? ` :: ${item.excerpt}` : "";
      return `- ${item.repoPath}${excerpt}`;
    })
    .join("\n");
  const acceptanceCriteria = input.queueItem.acceptanceCriteria
    .map((criterion) => `- ${criterion}`)
    .join("\n");
  const blockers = input.queueItem.blockedBy.length
    ? input.queueItem.blockedBy.map((blocker) => `- ${blocker}`).join("\n")
    : "- No explicit blocker recorded in the canonical queue.";

  return [
    `Eden self-work queue item id: ${input.queueItem.id}`,
    `Chapter: ${input.queueItem.chapter}`,
    `Summary: ${input.queueItem.summary}`,
    "",
    "Required canonical inputs:",
    loadedInputs,
    "",
    "Acceptance criteria:",
    acceptanceCriteria,
    "",
    "Current blockers or watchpoints:",
    blockers,
    "",
    `Timeline note: ${input.timelineExcerpt}`,
    "",
    "Execution boundaries:",
    "- Scope is Eden core self-improvement only.",
    "- Use the owner-only internal sandbox runtime only.",
    "- Record planner and worker output honestly inside control-plane task records.",
    "- Do not claim real deployment, provider execution, container execution, or external publication unless already verified.",
    input.queueItem.requiresOwnerReview
      ? "- Stop for owner review after this queued task record is produced."
      : "- Owner review may still intervene before the next queue item is pulled.",
  ].join("\n");
}

function formatLaneLabel(value: EdenSelfWorkLane) {
  if (value === "short_horizon") {
    return "Short Horizon";
  }

  if (value === "stabilization") {
    return "Post-v1 Stabilization";
  }

  return "Immediate Next";
}

function formatApprovalStateLabel(value: EdenSelfWorkApprovalState) {
  if (value === "owner_review") {
    return "Owner Review";
  }

  if (value === "blocked") {
    return "Blocked";
  }

  if (value === "parked") {
    return "Parked";
  }

  return "Approved";
}

function describeEdenSelfWorkFailure(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return "The runtime control-plane schema is not fully available yet. Apply the pending Prisma migrations before using Eden self-work controls.";
  }

  return describeProjectRuntimeFailure(error);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: Date) {
  return value.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
