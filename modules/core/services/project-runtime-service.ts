import "server-only";

import { EdenRole, Prisma, UserStatus } from "@prisma/client";
import type {
  EdenProjectRuntimeRecord,
  EdenProjectRuntimeRegistryState,
  EdenProjectRuntimeTaskArtifactRecord,
  EdenProjectRuntimeTaskRecord,
  EdenProjectRuntimeTaskState,
} from "@/modules/core/projects/project-runtime-shared";
import {
  edenInternalSandboxLeadAgentLabel,
  edenInternalSandboxWorkerAgentLabel,
  edenOwnerInternalSandboxBusinessId,
  edenOwnerInternalSandboxDomainLinkId,
  edenOwnerInternalSandboxProjectId,
  edenOwnerInternalSandboxRuntimeId,
} from "@/modules/core/projects/project-runtime-shared";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const projectRuntimeRegistryInclude = {
  creatorUser: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  project: {
    select: {
      id: true,
      title: true,
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  domainLinks: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.ProjectRuntimeInclude;

type ProjectRuntimeRegistryRecord = Prisma.ProjectRuntimeGetPayload<{
  include: typeof projectRuntimeRegistryInclude;
}>;

const projectRuntimeTaskInclude = {
  creatorUser: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  runtime: {
    select: {
      id: true,
      name: true,
      runtimeType: true,
      accessPolicy: true,
    },
  },
} satisfies Prisma.ProjectRuntimeTaskInclude;

type ProjectRuntimeTaskReadRecord = Prisma.ProjectRuntimeTaskGetPayload<{
  include: typeof projectRuntimeTaskInclude;
}>;

type EdenProjectRuntimeActor = {
  id: string;
  username: string;
  displayName: string;
  role: "consumer" | "business" | "owner";
  status: string;
  edenBalanceCredits?: number;
};

export async function loadOwnerProjectRuntimeRegistryState(): Promise<EdenProjectRuntimeRegistryState> {
  try {
    const prisma = getPrismaClient();
    const runtimes = await prisma.projectRuntime.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: projectRuntimeRegistryInclude,
    });

    return {
      runtimes: runtimes.map(mapProjectRuntimeRecord),
      unavailableReason: null,
    };
  } catch (error) {
    logProjectRuntimeFailure("load_owner_project_runtime_registry", error);

    return {
      runtimes: [],
      unavailableReason: describeProjectRuntimeFailure(error),
    };
  }
}

export async function loadOwnerInternalSandboxTaskState(): Promise<EdenProjectRuntimeTaskState> {
  try {
    const prisma = getPrismaClient();
    const runtime = await prisma.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      select: {
        id: true,
      },
    });

    if (!runtime) {
      return {
        tasks: [],
        unavailableReason: null,
        runtimeMissing: true,
      };
    }

    const tasks = await prisma.projectRuntimeTask.findMany({
      where: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: projectRuntimeTaskInclude,
    });

    return {
      tasks: tasks.map(mapProjectRuntimeTaskRecord),
      unavailableReason: null,
      runtimeMissing: false,
    };
  } catch (error) {
    logProjectRuntimeFailure("load_owner_internal_sandbox_task_state", error);

    return {
      tasks: [],
      unavailableReason: describeProjectRuntimeTaskFailure(error),
      runtimeMissing: false,
    };
  }
}

export async function createOwnerInternalSandboxTask(
  actor: EdenProjectRuntimeActor,
  input: {
    title?: string | null;
    inputText: string;
  },
) {
  const prisma = getPrismaClient();
  let createdTaskId: string | null = null;

  try {
    const runtime = await prisma.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      select: {
        id: true,
        accessPolicy: true,
        runtimeType: true,
      },
    });

    if (!runtime) {
      return {
        ok: false as const,
        status: 409,
        error:
          "Register the Eden Internal Sandbox Runtime before creating sandbox tasks.",
      };
    }

    if (
      runtime.accessPolicy !== "OWNER_ONLY" ||
      runtime.runtimeType !== "INTERNAL_SANDBOX"
    ) {
      return {
        ok: false as const,
        status: 409,
        error:
          "The internal sandbox runtime is not currently configured as an owner-only sandbox scope.",
      };
    }

    const normalizedInput = normalizeSandboxTaskInput(input.inputText);

    if (!normalizedInput || normalizedInput.length < 12) {
      return {
        ok: false as const,
        status: 400,
        error:
          "Enter a clearer sandbox task brief before starting a sandbox task run.",
      };
    }

    await upsertProjectRuntimeActor(prisma, actor);

    const taskType = resolveProjectRuntimeTaskType(normalizedInput);
    const taskTitle =
      normalizeSandboxTaskTitle(input.title) ?? buildSandboxTaskTitle(normalizedInput);

    const createdTask = await prisma.projectRuntimeTask.create({
      data: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        creatorUserId: actor.id,
        title: taskTitle,
        inputText: normalizedInput,
        taskType,
        status: "PLANNING",
        outputLines: [],
      },
      include: projectRuntimeTaskInclude,
    });
    createdTaskId = createdTask.id;

    const plannerPayload = buildSandboxPlannerPayload({
      taskType,
      title: createdTask.title,
      inputText: createdTask.inputText,
    });
    const plannerCompletedAt = new Date();

    await prisma.projectRuntimeTask.update({
      where: {
        id: createdTask.id,
      },
      data: {
        status: "RUNNING",
        plannerSummary: plannerPayload.summary,
        plannerPayload: plannerPayload.payload,
        plannerCompletedAt,
      },
    });

    const workerPayload = buildSandboxWorkerPayload({
      taskType,
      title: createdTask.title,
      inputText: createdTask.inputText,
      plannerPayload: plannerPayload.payload,
    });
    const workerCompletedAt = new Date();

    const completedTask = await prisma.projectRuntimeTask.update({
      where: {
        id: createdTask.id,
      },
      data: {
        status: "COMPLETED",
        workerSummary: workerPayload.summary,
        workerPayload: workerPayload.payload,
        outputSummary: workerPayload.outputSummary,
        outputLines: workerPayload.outputLines,
        workerCompletedAt,
        completedAt: workerCompletedAt,
      },
      include: projectRuntimeTaskInclude,
    });

    return {
      ok: true as const,
      task: mapProjectRuntimeTaskRecord(completedTask),
    };
  } catch (error) {
    if (createdTaskId) {
      await prisma.projectRuntimeTask
        .update({
          where: {
            id: createdTaskId,
          },
          data: {
            status: "FAILED",
            failureDetail: getProjectRuntimeErrorMessage(error),
          },
        })
        .catch(() => undefined);
    }

    logProjectRuntimeFailure("create_owner_internal_sandbox_task", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeTaskFailure(error),
    };
  }
}

export async function registerOwnerInternalSandboxRuntime(
  actor: EdenProjectRuntimeActor,
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction) => {
    await upsertProjectRuntimeActor(transaction, actor);

    await transaction.business.upsert({
      where: {
        id: edenOwnerInternalSandboxBusinessId,
      },
      update: {
        ownerUserId: actor.id,
        name: "Eden Internal Sandbox",
        status: "TESTING",
        category: "Platform Development",
        tags: ["eden", "internal", "sandbox"],
        description:
          "Private internal workspace reserved for building and validating future Eden shell changes before they are promoted into Eden core.",
        summary:
          "Owner-only internal Eden workspace for sandboxed platform development metadata.",
        tagline: "Owner-only Eden sandbox workspace.",
        targetAudience: "Eden owner and future Eden release workflows",
        monetizationModel: "Not for sale",
        visibility: "INTERNAL_TESTING",
        teamLabel: "Eden Core Internal",
        nextMilestone: "Define isolated runtime provisioning and promotion flow.",
      },
      create: {
        id: edenOwnerInternalSandboxBusinessId,
        ownerUserId: actor.id,
        name: "Eden Internal Sandbox",
        status: "TESTING",
        category: "Platform Development",
        tags: ["eden", "internal", "sandbox"],
        description:
          "Private internal workspace reserved for building and validating future Eden shell changes before they are promoted into Eden core.",
        summary:
          "Owner-only internal Eden workspace for sandboxed platform development metadata.",
        tagline: "Owner-only Eden sandbox workspace.",
        targetAudience: "Eden owner and future Eden release workflows",
        monetizationModel: "Not for sale",
        visibility: "INTERNAL_TESTING",
        teamLabel: "Eden Core Internal",
        nextMilestone: "Define isolated runtime provisioning and promotion flow.",
      },
    });

    await transaction.businessMember.upsert({
      where: {
        businessId_userId: {
          businessId: edenOwnerInternalSandboxBusinessId,
          userId: actor.id,
        },
      },
      update: {
        role: "OWNER",
        title: "Eden Sandbox Owner",
      },
      create: {
        businessId: edenOwnerInternalSandboxBusinessId,
        userId: actor.id,
        role: "OWNER",
        title: "Eden Sandbox Owner",
      },
    });

    await transaction.projectBlueprint.upsert({
      where: {
        id: edenOwnerInternalSandboxProjectId,
      },
      update: {
        businessId: edenOwnerInternalSandboxBusinessId,
        creatorUserId: actor.id,
        title: "Eden Inside Eden Sandbox",
        description:
          "Private internal project blueprint for building, testing, and reviewing future Eden versions before they touch Eden core.",
        goal:
          "Represent the owner-only Eden sandbox as a controlled project/runtime pair inside the Eden platform shell without claiming real deployment before infrastructure exists.",
        status: "TESTING",
      },
      create: {
        id: edenOwnerInternalSandboxProjectId,
        businessId: edenOwnerInternalSandboxBusinessId,
        creatorUserId: actor.id,
        title: "Eden Inside Eden Sandbox",
        description:
          "Private internal project blueprint for building, testing, and reviewing future Eden versions before they touch Eden core.",
        goal:
          "Represent the owner-only Eden sandbox as a controlled project/runtime pair inside the Eden platform shell without claiming real deployment before infrastructure exists.",
        status: "TESTING",
      },
    });

    const existingRuntime = await transaction.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      select: {
        id: true,
      },
    });

    await transaction.projectRuntime.upsert({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      update: {
        projectId: edenOwnerInternalSandboxProjectId,
        creatorUserId: actor.id,
        name: "Eden Internal Sandbox Runtime",
        purpose:
          "Owner-only private runtime registry entry for future Eden development, staging, and release validation.",
        runtimeType: "INTERNAL_SANDBOX",
        environment: "DEVELOPMENT",
        target: "EDEN_INTERNAL",
        accessPolicy: "OWNER_ONLY",
        visibility: "PRIVATE_INTERNAL",
      },
      create: {
        id: edenOwnerInternalSandboxRuntimeId,
        projectId: edenOwnerInternalSandboxProjectId,
        creatorUserId: actor.id,
        name: "Eden Internal Sandbox Runtime",
        purpose:
          "Owner-only private runtime registry entry for future Eden development, staging, and release validation.",
        runtimeType: "INTERNAL_SANDBOX",
        environment: "DEVELOPMENT",
        target: "EDEN_INTERNAL",
        accessPolicy: "OWNER_ONLY",
        visibility: "PRIVATE_INTERNAL",
        status: "REGISTERED",
        runtimeLocator: "eden://internal-sandbox/development",
        statusDetail:
          "Metadata only. No isolated runtime has been provisioned yet.",
      },
    });

    await transaction.projectRuntimeDomainLink.upsert({
      where: {
        id: edenOwnerInternalSandboxDomainLinkId,
      },
      update: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        linkType: "INTERNAL_PREVIEW",
        hostname: "sandbox.eden.internal",
        pathPrefix: "/owner-sandbox",
        isPrimary: true,
      },
      create: {
        id: edenOwnerInternalSandboxDomainLinkId,
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        linkType: "INTERNAL_PREVIEW",
        hostname: "sandbox.eden.internal",
        pathPrefix: "/owner-sandbox",
        isPrimary: true,
        isActive: false,
      },
    });

    const runtime = await transaction.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      include: projectRuntimeRegistryInclude,
    });

    if (!runtime) {
      throw new Error(
        "Eden could not load the internal sandbox runtime after registration.",
      );
    }

    return {
      created: !existingRuntime,
      runtime: mapProjectRuntimeRecord(runtime),
    };
  });
}

export function describeProjectRuntimeFailure(error: unknown) {
  if (isProjectRuntimeSchemaUnavailable(error)) {
    return "Project runtime tables are not available yet. Apply the latest Prisma migration before using the runtime registry.";
  }

  if (isProjectRuntimeDatabaseUnavailable(error)) {
    return "Project runtime registry could not reach Prisma cleanly. Verify database connectivity and permissions before using runtime control-plane features.";
  }

  return "Project runtime registry could not be loaded cleanly from Prisma. Review the server logs before relying on runtime control-plane data.";
}

export function describeProjectRuntimeTaskFailure(error: unknown) {
  if (isProjectRuntimeTaskSchemaUnavailable(error)) {
    return "Sandbox task tables are not available yet. Apply the latest Prisma migration before using the internal sandbox task runner.";
  }

  if (isProjectRuntimeDatabaseUnavailable(error)) {
    return "Sandbox task records could not reach Prisma cleanly. Verify database connectivity and permissions before using the internal sandbox task runner.";
  }

  return "Sandbox task runner state could not be loaded or updated cleanly from Prisma. Review the server logs before relying on sandbox task data.";
}

function mapProjectRuntimeRecord(
  runtime: ProjectRuntimeRegistryRecord,
): EdenProjectRuntimeRecord {
  const previewLink = runtime.domainLinks.find(
    (link) => link.linkType === "INTERNAL_PREVIEW" && link.isActive,
  );
  const edenManagedLink = runtime.domainLinks.find(
    (link) => link.linkType === "EDEN_MANAGED" && link.isActive,
  );
  const externalLink = runtime.domainLinks.find(
    (link) => link.linkType === "LINKED_EXTERNAL" && link.isActive,
  );

  return {
    id: runtime.id,
    projectId: runtime.project.id,
    projectTitle: runtime.project.title,
    businessId: runtime.project.business.id,
    businessName: runtime.project.business.name,
    creatorUserId: runtime.creatorUserId,
    creatorLabel: `${runtime.creatorUser.displayName} (@${runtime.creatorUser.username})`,
    name: runtime.name,
    purpose: runtime.purpose,
    runtimeType: runtime.runtimeType.toLowerCase(),
    runtimeTypeLabel: formatEnumLabel(runtime.runtimeType),
    environment: runtime.environment.toLowerCase(),
    environmentLabel: formatEnumLabel(runtime.environment),
    target: runtime.target.toLowerCase(),
    targetLabel: formatEnumLabel(runtime.target),
    accessPolicy: runtime.accessPolicy.toLowerCase(),
    accessPolicyLabel: formatEnumLabel(runtime.accessPolicy),
    visibility: runtime.visibility.toLowerCase(),
    visibilityLabel: formatEnumLabel(runtime.visibility),
    status: runtime.status.toLowerCase(),
    statusLabel: formatEnumLabel(runtime.status),
    statusDetail: runtime.statusDetail,
    runtimeLocator: runtime.runtimeLocator,
    previewUrl: previewLink ? buildDomainLinkLabel(previewLink) : null,
    hostedUrl: edenManagedLink ? buildDomainLinkLabel(edenManagedLink) : null,
    linkedDomain: externalLink ? buildDomainLinkLabel(externalLink) : null,
    isOwnerOnly: runtime.accessPolicy === "OWNER_ONLY",
    isInternalOnly:
      runtime.target === "EDEN_INTERNAL" ||
      runtime.visibility === "PRIVATE_INTERNAL" ||
      runtime.runtimeType === "INTERNAL_SANDBOX" ||
      runtime.runtimeType === "INTERNAL_PREVIEW",
    createdAtLabel: formatTimestamp(runtime.createdAt),
    updatedAtLabel: formatTimestamp(runtime.updatedAt),
    lastHealthCheckAtLabel: runtime.lastHealthCheckAt
      ? formatTimestamp(runtime.lastHealthCheckAt)
      : null,
    domainLinks: runtime.domainLinks.map((link) => ({
      id: link.id,
      linkType: link.linkType.toLowerCase(),
      linkTypeLabel: formatEnumLabel(link.linkType),
      hostname: link.hostname,
      pathPrefix: link.pathPrefix,
      urlLabel: buildDomainLinkLabel(link),
      isPrimary: link.isPrimary,
      isActive: link.isActive,
    })),
  };
}

function mapProjectRuntimeTaskRecord(
  task: ProjectRuntimeTaskReadRecord,
): EdenProjectRuntimeTaskRecord {
  const plannerPayload =
    task.plannerPayload &&
    typeof task.plannerPayload === "object" &&
    !Array.isArray(task.plannerPayload)
      ? (task.plannerPayload as SandboxPlannerPayload)
      : null;
  const workerPayload =
    task.workerPayload &&
    typeof task.workerPayload === "object" &&
    !Array.isArray(task.workerPayload)
      ? (task.workerPayload as SandboxWorkerPayload)
      : null;

  return {
    id: task.id,
    runtimeId: task.runtimeId,
    creatorUserId: task.creatorUserId,
    creatorLabel: `${task.creatorUser.displayName} (@${task.creatorUser.username})`,
    title: task.title,
    inputText: task.inputText,
    taskType: task.taskType.toLowerCase(),
    taskTypeLabel: formatEnumLabel(task.taskType),
    status: task.status.toLowerCase(),
    statusLabel: formatEnumLabel(task.status),
    executionMode: task.executionMode,
    executionModeLabel: formatExecutionModeLabel(task.executionMode),
    plannerSummary: task.plannerSummary,
    plannerWorkItems: plannerPayload?.workItems ?? [],
    plannerConstraints: plannerPayload?.constraints ?? [],
    plannerChecklist: plannerPayload?.reviewChecklist ?? [],
    workerSummary: task.workerSummary,
    workerActionPlan: workerPayload?.actionPlan ?? [],
    workerImplementationNotes: workerPayload?.implementationNotes ?? [],
    workerArtifacts: workerPayload?.artifacts ?? [],
    outputSummary: task.outputSummary,
    outputLines: task.outputLines,
    failureDetail: task.failureDetail,
    plannerCompletedAtLabel: task.plannerCompletedAt
      ? formatTimestamp(task.plannerCompletedAt)
      : null,
    workerCompletedAtLabel: task.workerCompletedAt
      ? formatTimestamp(task.workerCompletedAt)
      : null,
    completedAtLabel: task.completedAt ? formatTimestamp(task.completedAt) : null,
    createdAtLabel: formatTimestamp(task.createdAt),
    updatedAtLabel: formatTimestamp(task.updatedAt),
  };
}

type SandboxPlannerPayload = {
  leadAgentLabel: string;
  taskIntent: string;
  workstream: string;
  extractedSignals: string[];
  workItems: string[];
  constraints: string[];
  reviewChecklist: string[];
};

type SandboxWorkerPayload = {
  workerAgentLabel: string;
  resultType: string;
  executionNote: string;
  actionPlan: string[];
  implementationNotes: string[];
  artifacts: EdenProjectRuntimeTaskArtifactRecord[];
};

function buildSandboxPlannerPayload(input: {
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW";
  title: string;
  inputText: string;
}) {
  const extractedSignals = extractSandboxTaskSignals(input.inputText);
  const workItems = buildPlannerWorkItems(input.inputText, extractedSignals);
  const workstream = resolveSandboxWorkstream(input.inputText, input.taskType);
  const constraints = [
    "Owner-only Eden internal sandbox scope.",
    "Control-plane metadata only. No real container or runtime execution happens in v1.",
    "Do not claim production deployment, live preview activation, or domain publishing.",
  ];
  const reviewChecklist = [
    "Confirm the task remains scoped to the Eden Internal Sandbox Runtime.",
    "Keep implementation additive to current runtime control-plane records.",
    "Leave a clear human-readable output or plan after the worker step completes.",
  ];

  return {
    summary: `${edenInternalSandboxLeadAgentLabel} translated the task into ${workItems.length} work item${workItems.length === 1 ? "" : "s"} for a ${workstream.toLowerCase()} pass.`,
    payload: {
      leadAgentLabel: edenInternalSandboxLeadAgentLabel,
      taskIntent: resolveSandboxTaskIntent(input.taskType, input.title),
      workstream,
      extractedSignals,
      workItems,
      constraints,
      reviewChecklist,
    } satisfies SandboxPlannerPayload,
  };
}

function buildSandboxWorkerPayload(input: {
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW";
  title: string;
  inputText: string;
  plannerPayload: SandboxPlannerPayload;
}) {
  const actionPlan = buildWorkerActionPlan(input.inputText, input.plannerPayload);
  const implementationNotes = buildWorkerImplementationNotes(
    input.taskType,
    input.plannerPayload,
  );
  const artifacts = buildWorkerArtifacts(input.taskType, input.title, actionPlan);
  const executionNote =
    "Deterministic sandbox task runner only. Eden stored a planner record and worker result inside control-plane metadata without provisioning a real isolated runtime.";
  const outputSummary =
    input.taskType === "ANALYSIS"
      ? "Sandbox analysis record generated."
      : input.taskType === "QA_REVIEW"
        ? "Sandbox QA review plan generated."
        : "Sandbox implementation plan generated.";

  return {
    summary: `${edenInternalSandboxWorkerAgentLabel} produced a ${outputSummary.toLowerCase()} No real code executed inside an isolated runtime.`,
    outputSummary,
    outputLines: [
      `Task intent: ${input.plannerPayload.taskIntent}`,
      `Workstream: ${input.plannerPayload.workstream}`,
      executionNote,
      ...actionPlan,
    ],
    payload: {
      workerAgentLabel: edenInternalSandboxWorkerAgentLabel,
      resultType:
        input.taskType === "ANALYSIS"
          ? "analysis_record"
          : input.taskType === "QA_REVIEW"
            ? "qa_review_plan"
            : "implementation_plan",
      executionNote,
      actionPlan,
      implementationNotes,
      artifacts,
    } satisfies SandboxWorkerPayload,
  };
}

function extractSandboxTaskSignals(inputText: string) {
  const tokens = inputText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3);
  const stopWords = new Set([
    "that",
    "this",
    "with",
    "from",
    "into",
    "your",
    "have",
    "will",
    "task",
    "runtime",
    "sandbox",
    "owner",
  ]);

  return Array.from(
    new Set(tokens.filter((token) => !stopWords.has(token)).slice(0, 6)),
  );
}

function buildPlannerWorkItems(inputText: string, extractedSignals: string[]) {
  const sentenceWorkItems = inputText
    .split(/\r?\n|[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)
    .slice(0, 4);

  if (sentenceWorkItems.length > 0) {
    return sentenceWorkItems;
  }

  if (extractedSignals.length > 0) {
    return extractedSignals.map(
      (signal) => `Investigate and shape the sandbox task scope around ${signal}.`,
    );
  }

  return [
    "Clarify the desired change inside the owner-only internal sandbox scope.",
    "Map the control-plane records that must be updated or created.",
    "Produce a human-readable implementation or review outcome.",
  ];
}

function resolveSandboxWorkstream(
  inputText: string,
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW",
) {
  const normalized = inputText.toLowerCase();

  if (normalized.includes("schema") || normalized.includes("migration")) {
    return "Schema and migration planning";
  }

  if (normalized.includes("route") || normalized.includes("api")) {
    return "Owner API shaping";
  }

  if (normalized.includes("ui") || normalized.includes("page")) {
    return "Owner surface planning";
  }

  if (taskType === "ANALYSIS") {
    return "Sandbox analysis";
  }

  if (taskType === "QA_REVIEW") {
    return "Sandbox QA review";
  }

  return "Sandbox implementation planning";
}

function resolveSandboxTaskIntent(
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW",
  title: string,
) {
  if (taskType === "ANALYSIS") {
    return `Analyze sandbox request: ${title}`;
  }

  if (taskType === "QA_REVIEW") {
    return `Review sandbox request: ${title}`;
  }

  return `Plan sandbox implementation: ${title}`;
}

function buildWorkerActionPlan(
  inputText: string,
  plannerPayload: SandboxPlannerPayload,
) {
  const normalized = inputText.toLowerCase();
  const steps = [
    "Confirm the Eden Internal Sandbox Runtime remains the only target scope.",
    "Review existing control-plane records before introducing new writes or status changes.",
  ];

  if (normalized.includes("schema") || normalized.includes("model")) {
    steps.push(
      "Shape any Prisma changes as additive metadata extensions tied to the sandbox runtime.",
    );
  }

  if (normalized.includes("route") || normalized.includes("api")) {
    steps.push(
      "Add or adjust owner-only API handlers without widening business or consumer access.",
    );
  }

  if (normalized.includes("ui") || normalized.includes("surface")) {
    steps.push(
      "Update the owner runtime surface with the minimum honest controls needed for the task.",
    );
  }

  steps.push(
    "Record the resulting implementation plan or analysis output back into sandbox task metadata.",
  );

  return Array.from(new Set([...steps, ...plannerPayload.workItems])).slice(0, 6);
}

function buildWorkerImplementationNotes(
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW",
  plannerPayload: SandboxPlannerPayload,
) {
  const notes = [
    "This runner is synchronous and deterministic for v1; it does not dispatch to real background workers.",
    "Outputs are persisted as control-plane task records for later owner review.",
  ];

  if (taskType === "ANALYSIS") {
    notes.push(
      "Analysis tasks summarize the current state and likely next implementation pressure points.",
    );
  } else if (taskType === "QA_REVIEW") {
    notes.push(
      "QA review tasks focus on validation criteria and failure checks rather than runtime execution.",
    );
  } else {
    notes.push(
      "Implementation-plan tasks propose staged work only and do not claim code has been executed in an isolated environment.",
    );
  }

  notes.push(...plannerPayload.constraints.slice(0, 2));
  return notes.slice(0, 5);
}

function buildWorkerArtifacts(
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW",
  title: string,
  actionPlan: string[],
) {
  const artifacts: EdenProjectRuntimeTaskArtifactRecord[] = [
    {
      label: "Structured execution record",
      detail: `Lead/Planner recorded the sandbox task intent for "${title}".`,
    },
    {
      label: "Worker result payload",
      detail:
        taskType === "ANALYSIS"
          ? "Analysis summary stored for owner review."
          : taskType === "QA_REVIEW"
            ? "QA review plan stored for owner review."
            : "Implementation plan stored for owner review.",
    },
  ];

  if (actionPlan[0]) {
    artifacts.push({
      label: "Top next step",
      detail: actionPlan[0],
    });
  }

  return artifacts;
}

function resolveProjectRuntimeTaskType(inputText: string) {
  const normalized = inputText.toLowerCase();

  if (
    normalized.includes("review") ||
    normalized.includes("test") ||
    normalized.includes("qa")
  ) {
    return "QA_REVIEW" as const;
  }

  if (
    normalized.includes("audit") ||
    normalized.includes("analyze") ||
    normalized.includes("analysis") ||
    normalized.includes("inspect")
  ) {
    return "ANALYSIS" as const;
  }

  return "IMPLEMENTATION_PLAN" as const;
}

function normalizeSandboxTaskTitle(title: string | null | undefined) {
  const normalized = title?.trim();
  return normalized ? normalized : null;
}

function buildSandboxTaskTitle(inputText: string) {
  const firstLine =
    inputText
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? inputText;

  return firstLine.length <= 72 ? firstLine : `${firstLine.slice(0, 69)}...`;
}

function normalizeSandboxTaskInput(inputText: string) {
  return inputText.replace(/\r\n/g, "\n").trim();
}

async function upsertProjectRuntimeActor(
  transaction: Prisma.TransactionClient | ReturnType<typeof getPrismaClient>,
  actor: EdenProjectRuntimeActor,
) {
  await transaction.user.upsert({
    where: {
      id: actor.id,
    },
    update: {
      username: actor.username,
      displayName: actor.displayName,
      role: toPrismaRole(actor.role),
      status: toPrismaUserStatus(actor.status),
      edenBalanceCredits: actor.edenBalanceCredits ?? 0,
    },
    create: {
      id: actor.id,
      username: actor.username,
      displayName: actor.displayName,
      role: toPrismaRole(actor.role),
      status: toPrismaUserStatus(actor.status),
      edenBalanceCredits: actor.edenBalanceCredits ?? 0,
    },
  });
}

function toPrismaRole(role: EdenProjectRuntimeActor["role"]) {
  if (role === "owner") {
    return EdenRole.OWNER;
  }

  if (role === "business") {
    return EdenRole.BUSINESS;
  }

  return EdenRole.CONSUMER;
}

function toPrismaUserStatus(status: string) {
  if (status === "review") {
    return UserStatus.REVIEW;
  }

  if (status === "frozen") {
    return UserStatus.FROZEN;
  }

  return UserStatus.ACTIVE;
}

function isProjectRuntimeSchemaUnavailable(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return true;
  }

  const message = getProjectRuntimeErrorMessage(error).toLowerCase();

  return (
    message.includes("projectruntime") ||
    message.includes("projectruntimedomainlink") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("does not exist"))
  );
}

function isProjectRuntimeTaskSchemaUnavailable(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return true;
  }

  const message = getProjectRuntimeErrorMessage(error).toLowerCase();

  return (
    message.includes("projectruntimetask") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("does not exist"))
  );
}

function isProjectRuntimeDatabaseUnavailable(error: unknown) {
  const message = getProjectRuntimeErrorMessage(error).toLowerCase();

  return (
    message.includes("eacces") ||
    message.includes("permission denied") ||
    message.includes("database_url") ||
    message.includes("can't reach database server") ||
    message.includes("connection") ||
    message.includes("timed out")
  );
}

function getProjectRuntimeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown project runtime control-plane error";
}

function buildDomainLinkLabel(link: {
  hostname: string;
  pathPrefix: string | null;
}) {
  return `${link.hostname}${link.pathPrefix ?? ""}`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatExecutionModeLabel(value: string) {
  if (value === "synchronous_sandbox_v1") {
    return "Synchronous Sandbox v1";
  }

  return value;
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function logProjectRuntimeFailure(operation: string, error: unknown) {
  const message = getProjectRuntimeErrorMessage(error);

  console.warn(
    `[eden-project-runtime] Control-plane operation failed during ${operation}. ${message}`,
  );
}
