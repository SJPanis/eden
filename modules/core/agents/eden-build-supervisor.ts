import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EdenBuildSupervisorHistoryRecord,
  EdenBuildSupervisorPacketRecord,
  EdenBuildSupervisorState,
  EdenBuildSupervisorTaskReadiness,
  EdenBuildSupervisorTaskRecord,
} from "@/modules/core/agents/eden-build-supervisor-shared";
import { loadEdenOwnerControlPlaneState } from "@/modules/core/agents/eden-owner-constitution";
import { loadEdenSelfWorkState } from "@/modules/core/agents/eden-self-work-loop";
import type { EdenSelfWorkQueueRecord } from "@/modules/core/agents/eden-self-work-shared";

const buildSupervisorSpecPath = "eden-system/specs/EDEN_BUILD_SUPERVISOR.md";
const buildSupervisorStatePath = "eden-system/state/EDEN_BUILD_SUPERVISOR_STATE.json";
const codexExecutionPacketPath = "eden-system/state/EDEN_CODEX_EXECUTION_PACKET.json";
const currentStatePath = "eden-system/state/CURRENT_STATE.md";
const taskQueuePath = "eden-system/state/TASK_QUEUE.md";
const humanActionsPath = "eden-system/state/HUMAN_ACTIONS_REQUIRED.md";
const timelinePath = "eden-system/state/EDEN_POST_DEPLOY_TIMELINE.md";
const changelogPath = "eden-system/logs/CHANGELOG_AGENT.md";
const codexPromptPath = "eden-system/prompts/CODEX_TASK_EXECUTOR.md";

const managedSectionStart = "<!-- EDEN_BUILD_SUPERVISOR:START -->";
const managedSectionEnd = "<!-- EDEN_BUILD_SUPERVISOR:END -->";

const packetFileHints: Record<string, string[]> = {
  apply_live_runtime_migrations: [
    "prisma/schema.prisma",
    "prisma/migrations/20260311120000_pre_runtime_baseline/migration.sql",
    "prisma/migrations/20260311143000_project_runtime_control_plane/migration.sql",
    "prisma/migrations/20260311190000_internal_sandbox_task_runner_v1/migration.sql",
    "prisma/migrations/20260311213000_owner_runtime_lifecycle_audit_v1/migration.sql",
    "prisma/migrations/20260311233000_runtime_launch_intent_deployment_history_v1/migration.sql",
    "prisma/migrations/20260311235500_runtime_config_secret_boundary_provider_scaffold_v1/migration.sql",
    "modules/core/services/project-runtime-service.ts",
    "app/(owner)/owner/runtimes/page.tsx",
  ],
  secret_boundary_status_controls: [
    "modules/core/services/project-runtime-service.ts",
    "modules/core/projects/project-runtime-shared.ts",
    "ui/owner/owner-runtime-config-panel.tsx",
    "ui/owner/owner-runtime-registry.tsx",
    "app/api/owner/project-runtimes/[runtimeId]/config/route.ts",
    "modules/core/agents/eden-provider-adapters.ts",
  ],
  task_audit_and_queue_boundary: [
    "modules/core/services/project-runtime-service.ts",
    "modules/core/projects/project-runtime-shared.ts",
    "ui/owner/internal-sandbox-task-runner.tsx",
    "ui/owner/owner-eden-self-work-panel.tsx",
    "modules/core/agents/eden-self-work-loop.ts",
  ],
};

const packetConstraints = [
  "Do not perform broad rewrites.",
  "Do not break the runtime registry, sandbox task runner, lifecycle controls, audit logging, launch-intent, deployment-history, self-work loop, or owner/runtime pages.",
  "Do not expose raw secrets.",
  "Do not claim autonomous deployment, provider execution, or real runtime provisioning unless those capabilities are implemented and verified.",
  "Keep everything owner-controlled and future-friendly.",
];

const requiredStateUpdates = [
  currentStatePath,
  taskQueuePath,
  changelogPath,
  humanActionsPath,
];

type EdenBuildSupervisorActor = {
  id: string;
  username: string;
  displayName: string;
  role: "consumer" | "business" | "owner";
  status: string;
  edenBalanceCredits?: number;
};

type SupervisorResultStatus = "completed" | "blocked" | "review_required";

type BuildSupervisorStateFile = {
  version: string;
  mode: "owner_review_required";
  packetPath: string;
  completedTaskIds: string[];
  lastPreparedPacketTaskId: string | null;
  lastPreparedAt: string | null;
  packetStatus: "not_prepared" | "ready" | "stale";
  history: BuildSupervisorHistoryFileRecord[];
};

type BuildSupervisorHistoryFileRecord = {
  taskId: string;
  title: string;
  resultStatus: SupervisorResultStatus;
  summary: string;
  verification: string[];
  blockers: string[];
  humanActions: string[];
  actor: {
    id: string;
    username: string;
    displayName: string;
  };
  completedAt: string;
};

type CodexExecutionPacketFile = {
  version: string;
  status: "not_prepared" | "ready" | "stale";
  generatedAt: string | null;
  generatedBy: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  task: {
    id: string;
    title: string;
    chapter: string;
    laneLabel: string;
    summary: string;
    objective: string;
    acceptanceCriteria: string[];
    blockedBy: string[];
    requiresOwnerReview: boolean;
  } | null;
  repoContext: {
    repoRoot: string;
    sourceOfTruthPaths: string[];
    currentStateSummary: string[];
    taskQueueSummary: string[];
    humanActionsSummary: string[];
    timelineStopConditions: string[];
  };
  likelyFiles: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  requiredStateUpdates: string[];
  stopConditions: string[];
  notes: string[];
};

type SupervisorComputation = {
  stateFile: BuildSupervisorStateFile;
  packetFile: CodexExecutionPacketFile;
  tasks: EdenBuildSupervisorTaskRecord[];
  nextRecommendedTask: EdenBuildSupervisorTaskRecord | null;
  blockedHeadTask: EdenBuildSupervisorTaskRecord | null;
  reviewModeLabel: string;
  reviewRequired: boolean;
  missingControlInputs: number;
  trackedHumanActions: string[];
  lastCompletedTask: EdenBuildSupervisorHistoryRecord | null;
  unavailableReason: string | null;
  statusLabel: string;
  statusDetail: string;
};

export async function loadEdenBuildSupervisorState(): Promise<EdenBuildSupervisorState> {
  try {
    const computation = await computeBuildSupervisorState();
    const packet = mapPacketRecord(computation.packetFile);

    return {
      statusLabel: computation.statusLabel,
      statusDetail: computation.statusDetail,
      reviewModeLabel: computation.reviewModeLabel,
      reviewRequired: computation.reviewRequired,
      packetReady:
        packet.status === "ready" &&
        packet.taskId !== null &&
        packet.taskId === computation.nextRecommendedTask?.id,
      statePath: buildSupervisorStatePath,
      packetPath: codexExecutionPacketPath,
      missingControlInputs: computation.missingControlInputs,
      trackedHumanActions: computation.trackedHumanActions.length,
      nextRecommendedTask: computation.nextRecommendedTask,
      blockedHeadTask: computation.blockedHeadTask,
      tasks: computation.tasks,
      blockerDetails: computation.blockedHeadTask?.blockerDetails ?? [],
      packet,
      lastCompletedTask: computation.lastCompletedTask,
      unavailableReason: computation.unavailableReason,
    };
  } catch (error) {
    return {
      statusLabel: "Unavailable",
      statusDetail:
        "Eden could not load the build-supervisor control state from the current environment.",
      reviewModeLabel: "Owner review required after each supervised task",
      reviewRequired: true,
      packetReady: false,
      statePath: buildSupervisorStatePath,
      packetPath: codexExecutionPacketPath,
      missingControlInputs: 0,
      trackedHumanActions: 0,
      tasks: [],
      blockerDetails: [],
      packet: null,
      lastCompletedTask: null,
      unavailableReason:
        error instanceof Error ? error.message : "Unknown build supervisor error.",
    };
  }
}

export async function prepareEdenBuildSupervisorPacket(
  actor: EdenBuildSupervisorActor,
) {
  const computation = await computeBuildSupervisorState();

  if (computation.unavailableReason) {
    return {
      ok: false as const,
      status: 503,
      error: computation.unavailableReason,
    };
  }

  if (!computation.nextRecommendedTask) {
    return {
      ok: false as const,
      status: 409,
      error:
        computation.blockedHeadTask?.blockerDetails[0] ??
        "No Codex-ready Eden task is available right now.",
    };
  }

  const packet = await buildCodexExecutionPacketFile({
    actor,
    task: computation.nextRecommendedTask,
    blockedHeadTask: computation.blockedHeadTask,
  });
  const nextStateFile: BuildSupervisorStateFile = {
    ...computation.stateFile,
    lastPreparedPacketTaskId: computation.nextRecommendedTask.id,
    lastPreparedAt: new Date().toISOString(),
    packetStatus: "ready",
  };

  await Promise.all([
    writeJsonFile(codexExecutionPacketPath, packet),
    writeJsonFile(buildSupervisorStatePath, nextStateFile),
  ]);

  const refreshedState = await loadEdenBuildSupervisorState();
  await syncBuildSupervisorManagedSections(refreshedState);

  return {
    ok: true as const,
    state: refreshedState,
    packet: refreshedState.packet,
  };
}

export async function ingestEdenBuildSupervisorTaskResult(
  actor: EdenBuildSupervisorActor,
  input: {
    taskId: string;
    resultStatus: string;
    summary: string;
    verification?: string[] | string | null;
    blockers?: string[] | string | null;
    humanActions?: string[] | string | null;
  },
) {
  const taskId = input.taskId.trim();
  const summary = input.summary.trim();
  const resultStatus = parseResultStatus(input.resultStatus);

  if (!taskId) {
    return {
      ok: false as const,
      status: 400,
      error: "Task id is required before Eden can ingest a supervisor result.",
    };
  }

  if (!resultStatus) {
    return {
      ok: false as const,
      status: 400,
      error: "Select a valid supervisor result status before saving.",
    };
  }

  if (!summary) {
    return {
      ok: false as const,
      status: 400,
      error: "A completion summary is required before saving the supervisor result.",
    };
  }

  const computation = await computeBuildSupervisorState();
  const matchingTask = computation.tasks.find((task) => task.id === taskId);

  if (!matchingTask) {
    return {
      ok: false as const,
      status: 404,
      error: "The requested Eden self-work task could not be found.",
    };
  }

  const nextCompletedTaskIds = new Set(computation.stateFile.completedTaskIds);

  if (resultStatus === "completed") {
    nextCompletedTaskIds.add(taskId);
  }

  const historyEntry: BuildSupervisorHistoryFileRecord = {
    taskId,
    title: matchingTask.title,
    resultStatus,
    summary,
    verification: normalizeStringList(input.verification),
    blockers: normalizeStringList(input.blockers),
    humanActions: normalizeStringList(input.humanActions),
    actor: {
      id: actor.id,
      username: actor.username,
      displayName: actor.displayName,
    },
    completedAt: new Date().toISOString(),
  };

  await writeJsonFile(buildSupervisorStatePath, {
    ...computation.stateFile,
    completedTaskIds: Array.from(nextCompletedTaskIds),
    packetStatus: resultStatus === "completed" ? "ready" : "stale",
    history: [historyEntry, ...computation.stateFile.history].slice(0, 12),
  } satisfies BuildSupervisorStateFile);

  if (resultStatus === "completed") {
    const refreshedComputation = await computeBuildSupervisorState();
    const nextTask = refreshedComputation.nextRecommendedTask;

    if (nextTask) {
      const packet = await buildCodexExecutionPacketFile({
        actor,
        task: nextTask,
        blockedHeadTask: refreshedComputation.blockedHeadTask,
      });

      await Promise.all([
        writeJsonFile(codexExecutionPacketPath, packet),
        writeJsonFile(buildSupervisorStatePath, {
          ...refreshedComputation.stateFile,
          lastPreparedPacketTaskId: nextTask.id,
          lastPreparedAt: new Date().toISOString(),
          packetStatus: "ready",
        } satisfies BuildSupervisorStateFile),
      ]);
    } else {
      await writeJsonFile(codexExecutionPacketPath, {
        ...defaultCodexExecutionPacketFile(),
        status: "stale",
        notes: [
          "The previous packet was consumed. No next Codex-ready Eden task is available yet.",
        ],
      } satisfies CodexExecutionPacketFile);
    }
  } else {
    await writeJsonFile(codexExecutionPacketPath, {
      ...defaultCodexExecutionPacketFile(),
      status: "stale",
      notes: [
        "The current Codex packet is stale because the last supervisor result was not recorded as completed.",
      ],
    } satisfies CodexExecutionPacketFile);
  }

  const refreshedState = await loadEdenBuildSupervisorState();
  await syncBuildSupervisorManagedSections(refreshedState);

  return {
    ok: true as const,
    state: refreshedState,
  };
}

async function computeBuildSupervisorState(): Promise<SupervisorComputation> {
  const [
    controlPlaneState,
    selfWorkState,
    stateFile,
    packetFile,
    humanActionsMarkdown,
  ] = await Promise.all([
    loadEdenOwnerControlPlaneState(),
    loadEdenSelfWorkState(),
    readJsonFile(buildSupervisorStatePath, defaultBuildSupervisorStateFile()),
    readJsonFile(codexExecutionPacketPath, defaultCodexExecutionPacketFile()),
    readTextFile(humanActionsPath),
  ]);

  const trackedHumanActions = extractSectionBulletLines(
    humanActionsMarkdown,
    "## Immediate",
    24,
  );
  const completedTaskIds = new Set(stateFile.completedTaskIds);
  const latestCompletedByTask = new Map<string, BuildSupervisorHistoryFileRecord>();

  for (const entry of stateFile.history) {
    if (entry.resultStatus === "completed" && !latestCompletedByTask.has(entry.taskId)) {
      latestCompletedByTask.set(entry.taskId, entry);
    }
  }

  const headCandidateId =
    selfWorkState.queue.find(
      (item) =>
        item.approvalState === "approved" &&
        !item.linkedTask &&
        !completedTaskIds.has(item.id),
    )?.id ?? null;

  const tasks = selfWorkState.queue.map((item) =>
    mapSupervisorTask({
      item,
      isHeadCandidate: item.id === headCandidateId,
      completedEntry: latestCompletedByTask.get(item.id) ?? null,
      humanActions: trackedHumanActions,
    }),
  );

  const nextRecommendedTask = tasks.find((task) => task.readiness === "ready") ?? null;
  const blockedHeadTask =
    tasks.find((task) => task.isHeadCandidate && task.readiness === "blocked") ?? null;
  const missingControlInputs = controlPlaneState.inputs.filter(
    (input) => input.status === "missing",
  ).length;
  const lastCompletedTaskEntry =
    stateFile.history.find((entry) => entry.resultStatus === "completed") ?? null;

  let statusLabel = "Waiting";
  let statusDetail = "No Codex-ready Eden task is currently available.";

  if (selfWorkState.unavailableReason) {
    statusLabel = "Unavailable";
    statusDetail = selfWorkState.unavailableReason;
  } else if (missingControlInputs > 0) {
    statusLabel = "Blocked";
    statusDetail =
      "Required control inputs are missing, so Eden cannot prepare a Codex packet yet.";
  } else if (nextRecommendedTask) {
    const packetMatchesTask =
      packetFile.status === "ready" && packetFile.task?.id === nextRecommendedTask.id;
    statusLabel = packetMatchesTask ? "Ready" : "Packet needed";
    statusDetail = packetMatchesTask
      ? `Codex packet is prepared for "${nextRecommendedTask.title}".`
      : `The next Codex-ready task is "${nextRecommendedTask.title}", but the packet still needs to be prepared.`;
  } else if (blockedHeadTask) {
    statusLabel = "Blocked";
    statusDetail =
      blockedHeadTask.blockerDetails[0] ??
      "The highest-priority approved Eden task still requires human action first.";
  }

  return {
    stateFile,
    packetFile,
    tasks,
    nextRecommendedTask,
    blockedHeadTask,
    reviewModeLabel:
      selfWorkState.reviewModeLabel ??
      "Owner review required after each supervised task",
    reviewRequired: selfWorkState.reviewRequiredMode,
    missingControlInputs,
    trackedHumanActions,
    lastCompletedTask: lastCompletedTaskEntry
      ? mapHistoryRecord(lastCompletedTaskEntry)
      : null,
    unavailableReason: selfWorkState.unavailableReason ?? null,
    statusLabel,
    statusDetail,
  };
}

async function buildCodexExecutionPacketFile(input: {
  actor: EdenBuildSupervisorActor;
  task: EdenBuildSupervisorTaskRecord;
  blockedHeadTask: EdenBuildSupervisorTaskRecord | null;
}) {
  const [currentStateMarkdown, taskQueueMarkdown, humanActionsMarkdown, timelineMarkdown] =
    await Promise.all([
      readTextFile(currentStatePath),
      readTextFile(taskQueuePath),
      readTextFile(humanActionsPath),
      readTextFile(timelinePath),
    ]);

  const sourceOfTruthPaths = [
    "eden-system/specs/EDEN_MASTER_SPEC.md",
    "eden-system/specs/PROJECT_ISOLATION_MODEL.md",
    "eden-system/specs/AI_ORCHESTRATION_MODEL.md",
    "eden-system/specs/OWNER_CONTROL_CONSTITUTION.md",
    buildSupervisorSpecPath,
    currentStatePath,
    taskQueuePath,
    humanActionsPath,
    timelinePath,
    "eden-system/state/EDEN_SELF_WORK_QUEUE.json",
    changelogPath,
    codexPromptPath,
  ];
  const notes = [
    "This packet is for supervised build orchestration only.",
    "It does not authorize autonomous deployment, autonomous provider execution, or unrestricted repo mutation.",
    input.task.requiresOwnerReview
      ? "Owner review remains required after this task result is ingested."
      : "Owner review may still intervene before the next task is selected.",
    ...(input.blockedHeadTask
      ? [
          `Higher-priority approved task blocked: ${input.blockedHeadTask.title}.`,
          ...input.blockedHeadTask.blockerDetails,
        ]
      : []),
  ];

  return {
    version: "v1",
    status: "ready",
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: input.actor.id,
      username: input.actor.username,
      displayName: input.actor.displayName,
    },
    task: {
      id: input.task.id,
      title: input.task.title,
      chapter: input.task.chapter,
      laneLabel: input.task.laneLabel,
      summary: input.task.summary,
      objective: input.task.summary,
      acceptanceCriteria: input.task.acceptanceCriteria,
      blockedBy: input.task.blockerDetails,
      requiresOwnerReview: input.task.requiresOwnerReview,
    },
    repoContext: {
      repoRoot: process.cwd(),
      sourceOfTruthPaths,
      currentStateSummary: [
        ...extractSectionBulletLines(currentStateMarkdown, "## Architectural Reality", 3),
        ...extractSectionBulletLines(currentStateMarkdown, "## Current Blockers", 3),
      ].slice(0, 6),
      taskQueueSummary: extractSectionBulletLines(
        taskQueueMarkdown,
        `## ${input.task.chapter}`,
        6,
      ),
      humanActionsSummary: extractSectionBulletLines(
        humanActionsMarkdown,
        "## Immediate",
        5,
      ),
      timelineStopConditions: extractSectionBulletLines(
        timelineMarkdown,
        "## Stop Conditions",
        5,
      ),
    },
    likelyFiles: Array.from(
      new Set([
        ...requiredStateUpdates,
        ...(packetFileHints[input.task.id] ?? []),
      ]),
    ),
    constraints: packetConstraints,
    acceptanceCriteria: input.task.acceptanceCriteria,
    requiredStateUpdates,
    stopConditions: extractSectionBulletLines(
      timelineMarkdown,
      "## Stop Conditions",
      5,
    ),
    notes,
  } satisfies CodexExecutionPacketFile;
}

function mapSupervisorTask(input: {
  item: EdenSelfWorkQueueRecord;
  isHeadCandidate: boolean;
  completedEntry: BuildSupervisorHistoryFileRecord | null;
  humanActions: string[];
}) {
  const matchingHumanActions = matchHumanActionsForTask(
    input.item,
    input.humanActions,
  );
  const blockerDetails = [
    ...input.item.blockedBy,
    ...matchingHumanActions.map((action) => `Human action: ${action}`),
  ];
  const readiness = resolveTaskReadiness({
    item: input.item,
    completedEntry: input.completedEntry,
    blockerDetails,
  });

  return {
    id: input.item.id,
    title: input.item.title,
    chapter: input.item.chapter,
    laneLabel: input.item.laneLabel,
    summary: input.item.summary,
    acceptanceCriteria: input.item.acceptanceCriteria,
    requiresOwnerReview: input.item.requiresOwnerReview,
    readiness,
    readinessLabel: formatTaskReadinessLabel(readiness),
    isHeadCandidate: input.isHeadCandidate,
    isNextRecommended: readiness === "ready",
    blockerDetails,
    linkedTask: input.item.linkedTask,
    completedAtLabel: input.completedEntry
      ? formatTimestamp(new Date(input.completedEntry.completedAt))
      : null,
  } satisfies EdenBuildSupervisorTaskRecord;
}

function resolveTaskReadiness(input: {
  item: EdenSelfWorkQueueRecord;
  completedEntry: BuildSupervisorHistoryFileRecord | null;
  blockerDetails: string[];
}): EdenBuildSupervisorTaskReadiness {
  if (input.completedEntry) {
    return "completed";
  }

  if (input.item.linkedTask) {
    return "queued";
  }

  if (input.item.approvalState !== "approved") {
    return "pending_review";
  }

  if (input.blockerDetails.length > 0) {
    return "blocked";
  }

  return "ready";
}

function formatTaskReadinessLabel(value: EdenBuildSupervisorTaskReadiness) {
  switch (value) {
    case "completed":
      return "Completed";
    case "queued":
      return "Queued in sandbox";
    case "blocked":
      return "Blocked";
    case "pending_review":
      return "Pending review";
    default:
      return "Codex ready";
  }
}

function mapPacketRecord(packetFile: CodexExecutionPacketFile): EdenBuildSupervisorPacketRecord {
  return {
    status: packetFile.status,
    generatedAtLabel: packetFile.generatedAt
      ? formatTimestamp(new Date(packetFile.generatedAt))
      : null,
    taskId: packetFile.task?.id ?? null,
    taskTitle: packetFile.task?.title ?? null,
    objective: packetFile.task?.objective ?? null,
    likelyFiles: packetFile.likelyFiles,
    constraints: packetFile.constraints,
    acceptanceCriteria: packetFile.acceptanceCriteria,
    requiredStateUpdates: packetFile.requiredStateUpdates,
    blockerSummary: packetFile.notes,
  };
}

function mapHistoryRecord(entry: BuildSupervisorHistoryFileRecord): EdenBuildSupervisorHistoryRecord {
  return {
    taskId: entry.taskId,
    title: entry.title,
    resultStatus: entry.resultStatus,
    resultStatusLabel:
      entry.resultStatus === "review_required"
        ? "Review Required"
        : `${entry.resultStatus.charAt(0).toUpperCase()}${entry.resultStatus.slice(1)}`,
    summary: entry.summary,
    verification: entry.verification,
    blockers: entry.blockers,
    humanActions: entry.humanActions,
    completedAtLabel: formatTimestamp(new Date(entry.completedAt)),
  };
}

async function syncBuildSupervisorManagedSections(state: EdenBuildSupervisorState) {
  await Promise.all([
    upsertManagedSection(currentStatePath, "## Build Supervisor Digest", [
      `- Supervisor status: ${state.statusLabel}.`,
      `- Status detail: ${state.statusDetail}`,
      `- Next Codex-ready task: ${
        state.nextRecommendedTask
          ? `${state.nextRecommendedTask.id} - ${state.nextRecommendedTask.title}.`
          : "No task is Codex-ready right now."
      }`,
      `- Packet state: ${
        state.packet
          ? `${state.packet.status}${state.packet.taskTitle ? ` for ${state.packet.taskTitle}` : ""}.`
          : "No packet file loaded."
      }`,
      `- Last completed supervised task: ${
        state.lastCompletedTask
          ? `${state.lastCompletedTask.title} (${state.lastCompletedTask.completedAtLabel}).`
          : "None recorded yet."
      }`,
    ]),
    upsertManagedSection(taskQueuePath, "## Build Supervisor Digest", [
      `- Review mode: ${state.reviewModeLabel}.`,
      `- Current recommended task: ${
        state.nextRecommendedTask
          ? `${state.nextRecommendedTask.title}.`
          : "No current Codex-ready task."
      }`,
      `- Highest blocked approved task: ${
        state.blockedHeadTask
          ? `${state.blockedHeadTask.title}.`
          : "No blocked approved task is currently ahead of the recommendation."
      }`,
      `- Build-supervisor packet ready: ${state.packetReady ? "yes" : "no"}.`,
    ]),
    upsertManagedSection(changelogPath, "### Build Supervisor Latest Result", [
      state.lastCompletedTask
        ? `- Last completed supervised task: ${state.lastCompletedTask.title} (${state.lastCompletedTask.completedAtLabel}).`
        : "- No completed supervised task has been ingested yet.",
      state.lastCompletedTask
        ? `- Summary: ${state.lastCompletedTask.summary}`
        : "- Summary: No supervisor-ingested completion summary is recorded yet.",
      state.nextRecommendedTask
        ? `- Next recommended task: ${state.nextRecommendedTask.title}.`
        : "- Next recommended task: none yet.",
    ]),
    upsertManagedSection(humanActionsPath, "## Build Supervisor Tracked Actions", [
      ...(state.lastCompletedTask?.humanActions.length
        ? state.lastCompletedTask.humanActions.map((action) => `- ${action}`)
        : ["- No new supervisor-recorded human-required actions yet."]),
      `- Current blocked-task count: ${state.tasks.filter((task) => task.readiness === "blocked").length}.`,
    ]),
  ]);
}

async function upsertManagedSection(
  relativePath: string,
  heading: string,
  lines: string[],
) {
  const absolutePath = toAbsolutePath(relativePath);
  const content = await readFile(absolutePath, "utf8");
  const body = `${managedSectionStart}\n${lines.join("\n")}\n${managedSectionEnd}`;

  if (content.includes(managedSectionStart) && content.includes(managedSectionEnd)) {
    const nextContent = content.replace(
      new RegExp(
        `${escapeRegExp(managedSectionStart)}[\\s\\S]*?${escapeRegExp(
          managedSectionEnd,
        )}`,
      ),
      body,
    );
    await writeFile(absolutePath, nextContent, "utf8");
    return;
  }

  await writeFile(
    absolutePath,
    `${content.trimEnd()}\n\n${heading}\n\n${body}\n`,
    "utf8",
  );
}

function extractSectionBulletLines(
  markdown: string,
  heading: string,
  maxItems: number,
) {
  const section = extractMarkdownSection(markdown, heading);

  if (!section) {
    return [];
  }

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .slice(0, maxItems);
}

function extractMarkdownSection(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === heading);

  if (startIndex === -1) {
    return null;
  }

  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      break;
    }

    collected.push(lines[index]);
  }

  return collected.join("\n").trim();
}

function matchHumanActionsForTask(
  task: EdenSelfWorkQueueRecord,
  humanActions: string[],
) {
  const taskTokens = tokenizeForMatch(
    [task.title, task.summary, ...task.blockedBy].join(" "),
  );

  return humanActions.filter((action) => {
    const sharedCount = tokenizeForMatch(action).filter((token) =>
      taskTokens.includes(token),
    ).length;
    return sharedCount >= 2;
  });
}

function tokenizeForMatch(value: string) {
  return Array.from(
    new Set(
      (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
        (token) =>
          token.length > 2 &&
          ![
            "the",
            "and",
            "for",
            "with",
            "that",
            "this",
            "from",
            "into",
            "eden",
            "task",
            "owner",
            "only",
          ].includes(token),
      ),
    ),
  );
}

function normalizeStringList(value: string[] | string | null | undefined) {
  if (!value) {
    return [];
  }

  const entries = Array.isArray(value) ? value : value.split(/\r?\n/);

  return entries
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseResultStatus(value: string): SupervisorResultStatus | null {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "blocked" ||
    normalized === "review_required"
  ) {
    return normalized;
  }

  return null;
}

async function readTextFile(relativePath: string) {
  return readFile(toAbsolutePath(relativePath), "utf8");
}

async function readJsonFile<T>(relativePath: string, fallback: T) {
  try {
    const content = await readFile(toAbsolutePath(relativePath), "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(relativePath: string, value: unknown) {
  await writeFile(
    toAbsolutePath(relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function defaultBuildSupervisorStateFile(): BuildSupervisorStateFile {
  return {
    version: "v1",
    mode: "owner_review_required",
    packetPath: codexExecutionPacketPath,
    completedTaskIds: [],
    lastPreparedPacketTaskId: null,
    lastPreparedAt: null,
    packetStatus: "not_prepared",
    history: [],
  };
}

function defaultCodexExecutionPacketFile(): CodexExecutionPacketFile {
  return {
    version: "v1",
    status: "not_prepared",
    generatedAt: null,
    generatedBy: null,
    task: null,
    repoContext: {
      repoRoot: process.cwd(),
      sourceOfTruthPaths: [],
      currentStateSummary: [],
      taskQueueSummary: [],
      humanActionsSummary: [],
      timelineStopConditions: [],
    },
    likelyFiles: [],
    constraints: [],
    acceptanceCriteria: [],
    requiredStateUpdates: [],
    stopConditions: [],
    notes: [],
  };
}

function toAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

function formatTimestamp(value: Date) {
  return value.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
