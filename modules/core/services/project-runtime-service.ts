import "server-only";

import { EdenRole, Prisma, UserStatus } from "@prisma/client";
import {
  buildRuntimeProviderPreflight,
  evaluateRuntimeProviderCompatibility,
} from "@/modules/core/agents/eden-provider-adapters";
import {
  buildRuntimeExecutionDispatchPreflight,
  type EdenExecutionDispatchPreflightRecord,
  type EdenExecutionAdapterKey,
  type EdenRuntimeExecutionGovernanceSnapshot,
} from "@/modules/core/agents/eden-execution-adapters";
import type {
  EdenProjectRuntimeAuditLogRecord,
  EdenProjectRuntimeAgentRunRecord,
  EdenProjectRuntimeConfigRecord,
  EdenProjectRuntimeDispatchRecord,
  EdenProjectRuntimeDeploymentRecord,
  EdenProjectRuntimeExecutionSessionRecord,
  EdenProjectRuntimeLaunchIntentRecord,
  EdenProjectRuntimeProviderApprovalRecord,
  EdenProjectRuntimeProviderCompatibilityRecord,
  EdenProjectRuntimeRecord,
  EdenProjectRuntimeRegistryState,
  EdenProjectRuntimeSecretBoundaryRecord,
  EdenProjectRuntimeTaskArtifactRecord,
  EdenProjectRuntimeTaskRecord,
  EdenProjectRuntimeTaskState,
  OwnerRuntimeConfigScope,
  OwnerRuntimeDeploymentEventStatus,
  OwnerRuntimeDeploymentEventType,
  OwnerRuntimeHealthCheckAction,
  OwnerRuntimeLaunchIntentType,
  OwnerRuntimeLaunchMode,
  OwnerRuntimeLaunchTarget,
  OwnerRuntimeExecutionMode,
  OwnerRuntimeExecutionAdapter,
  OwnerRuntimeExecutionRole,
  OwnerRuntimeProvider,
  OwnerRuntimeProviderApprovalStatus,
  OwnerRuntimeProviderPolicyMode,
  OwnerRuntimeSecretStatus,
  OwnerRuntimeTaskRequestedAction,
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
  launchIntent: true,
  configPolicy: true,
  secretBoundaries: {
    orderBy: {
      createdAt: "asc",
    },
  },
  providerApprovals: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  agentRuns: {
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  executionSessions: {
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  dispatchRecords: {
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      session: {
        select: {
          id: true,
          sessionLabel: true,
        },
      },
    },
  },
  auditLogs: {
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  deploymentRecords: {
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
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
  agentRuns: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  dispatchRecords: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
      session: {
        select: {
          id: true,
          sessionLabel: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectRuntimeTaskInclude;

type ProjectRuntimeTaskReadRecord = Prisma.ProjectRuntimeTaskGetPayload<{
  include: typeof projectRuntimeTaskInclude;
}>;

type ProjectRuntimeAuditFieldName = string;

type ProjectRuntimeLaunchIntentTypeValue =
  | "INTERNAL_PREVIEW"
  | "EDEN_HOSTED"
  | "LINKED_EXTERNAL";

type ProjectRuntimeLaunchModeValue =
  | "CONTROL_PLANE_ONLY"
  | "EDEN_MANAGED_PROMOTION"
  | "EXTERNAL_HANDOFF";

type ProjectRuntimeConfigScopeValue =
  | "OWNER_INTERNAL"
  | "BUSINESS_RUNTIME"
  | "PUBLIC_RUNTIME";

type ProjectRuntimeExecutionModeValue =
  | "CONTROL_PLANE_ONLY"
  | "SANDBOX_TASK_RUNNER_V1"
  | "FUTURE_RUNTIME_AGENT"
  | "EXTERNAL_RUNTIME_HANDOFF";

type ProjectRuntimeProviderPolicyModeValue =
  | "EDEN_APPROVED_ONLY"
  | "RUNTIME_ALLOWLIST"
  | "OWNER_APPROVAL_REQUIRED";

type EdenAiProviderValue = "OPENAI" | "ANTHROPIC";

type ProjectRuntimeTargetValue =
  | "EDEN_INTERNAL"
  | "EDEN_MANAGED"
  | "EXTERNAL_DOMAIN";

type ProjectRuntimeDeploymentEventTypeValue =
  | "LAUNCH_INTENT_UPDATED"
  | "MANUAL_NOTE"
  | "PREVIEW_CHECKPOINT"
  | "HOSTED_CHECKPOINT"
  | "EXTERNAL_LINK_CHECKPOINT";

type ProjectRuntimeDeploymentEventStatusValue =
  | "RECORDED"
  | "PLANNED"
  | "READY"
  | "BLOCKED"
  | "FAILED";

type ProjectRuntimeSecretTypeValue =
  | "PROVIDER_API_KEY"
  | "WEBHOOK_SECRET"
  | "DATABASE_URL"
  | "SERVICE_TOKEN"
  | "ENVIRONMENT_GROUP";

type ProjectRuntimeSecretScopeValue =
  | "RUNTIME_ONLY"
  | "BUSINESS_SHARED"
  | "OWNER_INTERNAL";

type ProjectRuntimeSecretVisibilityPolicyValue =
  | "STATUS_ONLY"
  | "OWNER_METADATA_ONLY"
  | "RUNTIME_BOUNDARY_ONLY";

type ProjectRuntimeProviderApprovalStatusValue =
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "DENIED";
type ProjectRuntimeSecretStatusValue =
  | "CONFIGURED"
  | "MISSING"
  | "PENDING"
  | "RESERVED";
type ProjectRuntimeAgentActionTypeValue =
  | "PROVIDER_PREFLIGHT"
  | "SANDBOX_TEST"
  | "QA_VALIDATION"
  | "IMPLEMENTATION_REVIEW";
type ProjectRuntimeAgentRunStatusValue =
  | "PREFLIGHT_BLOCKED"
  | "PREPARED"
  | "COMPLETED"
  | "FAILED"
  | "REVIEW_REQUIRED";
type ProjectRuntimeDispatchStatusValue =
  | "QUEUED"
  | "READY"
  | "BLOCKED"
  | "DISPATCHED"
  | "COMPLETED"
  | "FAILED"
  | "REVIEW_REQUIRED";
type ProjectRuntimeDispatchModeValue =
  | "CONTROL_PLANE_PREFLIGHT"
  | "OWNER_REVIEW_GATE"
  | "ASYNC_WORKER_HANDOFF";
type ProjectRuntimeExecutionRoleValue =
  | "OWNER_SUPERVISOR"
  | "RUNTIME_LEAD"
  | "TOOL_WORKER"
  | "BROWSER_WORKER"
  | "QA_REVIEWER";
type ProjectRuntimeExecutionSessionTypeValue =
  | "SANDBOX_TASK"
  | "TOOL_EXECUTION"
  | "BROWSER_EXECUTION"
  | "PROVIDER_EXECUTION";
type ProjectRuntimeExecutionSessionStatusValue =
  | "PREPARED"
  | "BLOCKED"
  | "REVIEW_REQUIRED"
  | "CLOSED";
type ProjectRuntimeExecutionAdapterKindValue =
  | "PROVIDER"
  | "TOOL"
  | "BROWSER";
type ProjectRuntimeExecutionAdapterModeValue =
  | "PREFLIGHT_ONLY"
  | "SCAFFOLD_ONLY"
  | "FUTURE_LIVE";
type ProjectRuntimeTaskResultTypeValue =
  | "SANDBOX_PLAN"
  | "PROVIDER_PREFLIGHT"
  | "QA_RESULT"
  | "EXECUTION_REVIEW";
type ProjectRuntimeTaskResultStatusValue =
  | "PASS"
  | "FAIL"
  | "REVIEW_NEEDED"
  | "INFO";

type ProjectRuntimeLifecycleStatus =
  | "REGISTERED"
  | "CONFIGURING"
  | "READY"
  | "PAUSED"
  | "ERROR"
  | "ARCHIVED";

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

export async function updateOwnerProjectRuntimeLifecycle(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    status: string;
    statusDetail?: string | null;
    healthCheckAction?: OwnerRuntimeHealthCheckAction | string | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const nextStatus = parseProjectRuntimeLifecycleStatus(input.status);

  if (!runtimeId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id is required for lifecycle updates.",
    };
  }

  if (!nextStatus) {
    return {
      ok: false as const,
      status: 400,
      error: "Select a valid runtime status before saving lifecycle changes.",
    };
  }

  const nextStatusDetail = normalizeRuntimeStatusDetail(input.statusDetail);
  const healthCheckAction = normalizeRuntimeHealthCheckAction(
    input.healthCheckAction,
  );

  if (!healthCheckAction) {
    return {
      ok: false as const,
      status: 400,
      error: "Select a valid runtime health-check action before saving.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const currentRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        select: {
          id: true,
          status: true,
          statusDetail: true,
          lastHealthCheckAt: true,
        },
      });

      if (!currentRuntime) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested runtime record could not be found.",
        };
      }

      const lifecycleChanges: Prisma.ProjectRuntimeUpdateInput = {};
      const auditEntries: Prisma.ProjectRuntimeAuditLogCreateManyInput[] = [];

      if (currentRuntime.status !== nextStatus) {
        lifecycleChanges.status = nextStatus;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: "status",
            previousValue: currentRuntime.status,
            nextValue: nextStatus,
            detail:
              "Updated runtime status from the owner runtime control surface.",
          }),
        );
      }

      if ((currentRuntime.statusDetail ?? null) !== nextStatusDetail) {
        lifecycleChanges.statusDetail = nextStatusDetail;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: "statusDetail",
            previousValue: currentRuntime.statusDetail,
            nextValue: nextStatusDetail,
            detail:
              "Updated runtime status detail from the owner runtime control surface.",
          }),
        );
      }

      if (healthCheckAction === "set_now") {
        const nextHealthCheckAt = new Date();
        lifecycleChanges.lastHealthCheckAt = nextHealthCheckAt;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: "lastHealthCheckAt",
            previousValue: currentRuntime.lastHealthCheckAt?.toISOString() ?? null,
            nextValue: nextHealthCheckAt.toISOString(),
            detail:
              "Recorded a runtime health-check timestamp from the owner runtime control surface.",
          }),
        );
      }

      if (healthCheckAction === "clear" && currentRuntime.lastHealthCheckAt) {
        lifecycleChanges.lastHealthCheckAt = null;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: "lastHealthCheckAt",
            previousValue: currentRuntime.lastHealthCheckAt.toISOString(),
            nextValue: null,
            detail:
              "Cleared the recorded runtime health-check timestamp from the owner runtime control surface.",
          }),
        );
      }

      if (!auditEntries.length) {
        const unchangedRuntime = await transaction.projectRuntime.findUnique({
          where: {
            id: runtimeId,
          },
          include: projectRuntimeRegistryInclude,
        });

        if (!unchangedRuntime) {
          throw new Error(
            "Eden could not reload the runtime record after a no-op lifecycle update.",
          );
        }

        return {
          ok: true as const,
          changed: false,
          runtime: mapProjectRuntimeRecord(unchangedRuntime),
        };
      }

      await transaction.projectRuntime.update({
        where: {
          id: runtimeId,
        },
        data: lifecycleChanges,
      });

      await transaction.projectRuntimeAuditLog.createMany({
        data: auditEntries,
      });

      const updatedRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        include: projectRuntimeRegistryInclude,
      });

      if (!updatedRuntime) {
        throw new Error(
          "Eden could not reload the runtime record after saving lifecycle changes.",
        );
      }

      return {
        ok: true as const,
        changed: true,
        runtime: mapProjectRuntimeRecord(updatedRuntime),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure("update_owner_project_runtime_lifecycle", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
    };
  }
}

export async function updateOwnerProjectRuntimeLaunchIntent(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    intentType: string;
    intendedTarget: string;
    launchMode: string;
    destinationLabel?: string | null;
    notes?: string | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const nextIntentType = parseProjectRuntimeLaunchIntentType(input.intentType);
  const nextIntendedTarget = parseProjectRuntimeLaunchTarget(input.intendedTarget);
  const nextLaunchMode = parseProjectRuntimeLaunchMode(input.launchMode);
  const nextDestinationLabel = normalizeLaunchDestinationLabel(
    input.destinationLabel,
  );
  const nextNotes = normalizeLaunchIntentNotes(input.notes);

  if (!runtimeId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id is required before saving launch intent metadata.",
    };
  }

  if (!nextIntentType || !nextIntendedTarget || !nextLaunchMode) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Select a valid launch intent type, intended target, and launch mode before saving.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const currentRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        select: {
          id: true,
          name: true,
          launchIntent: {
            select: {
              id: true,
              intentType: true,
              intendedTarget: true,
              launchMode: true,
              destinationLabel: true,
              notes: true,
            },
          },
        },
      });

      if (!currentRuntime) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested runtime record could not be found.",
        };
      }

      const intentChanged =
        !currentRuntime.launchIntent ||
        currentRuntime.launchIntent.intentType !== nextIntentType ||
        currentRuntime.launchIntent.intendedTarget !== nextIntendedTarget ||
        currentRuntime.launchIntent.launchMode !== nextLaunchMode ||
        (currentRuntime.launchIntent.destinationLabel ?? null) !==
          nextDestinationLabel ||
        (currentRuntime.launchIntent.notes ?? null) !== nextNotes;

      if (!intentChanged) {
        const unchangedRuntime = await transaction.projectRuntime.findUnique({
          where: {
            id: runtimeId,
          },
          include: projectRuntimeRegistryInclude,
        });

        if (!unchangedRuntime) {
          throw new Error(
            "Eden could not reload the runtime record after a no-op launch intent update.",
          );
        }

        return {
          ok: true as const,
          changed: false,
          runtime: mapProjectRuntimeRecord(unchangedRuntime),
        };
      }

      if (currentRuntime.launchIntent) {
        await transaction.projectRuntimeLaunchIntent.update({
          where: {
            runtimeId,
          },
          data: {
            intentType: nextIntentType,
            intendedTarget: nextIntendedTarget,
            launchMode: nextLaunchMode,
            destinationLabel: nextDestinationLabel,
            notes: nextNotes,
          },
        });
      } else {
        await transaction.projectRuntimeLaunchIntent.create({
          data: {
            runtimeId,
            intentType: nextIntentType,
            intendedTarget: nextIntendedTarget,
            launchMode: nextLaunchMode,
            destinationLabel: nextDestinationLabel,
            notes: nextNotes,
          },
        });
      }

      await transaction.projectRuntimeDeploymentRecord.create({
        data: {
          runtimeId,
          actorUserId: actor.id,
          eventType: "LAUNCH_INTENT_UPDATED",
          eventStatus: "RECORDED",
          summary: buildLaunchIntentDeploymentSummary({
            runtimeName: currentRuntime.name,
            intentType: nextIntentType,
            intendedTarget: nextIntendedTarget,
          }),
          detail: buildLaunchIntentDeploymentDetail({
            launchMode: nextLaunchMode,
            destinationLabel: nextDestinationLabel,
            notes: nextNotes,
          }),
        },
      });

      const updatedRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        include: projectRuntimeRegistryInclude,
      });

      if (!updatedRuntime) {
        throw new Error(
          "Eden could not reload the runtime record after saving launch intent metadata.",
        );
      }

      return {
        ok: true as const,
        changed: true,
        runtime: mapProjectRuntimeRecord(updatedRuntime),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure("update_owner_project_runtime_launch_intent", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
    };
  }
}

export async function updateOwnerProjectRuntimeConfigPolicy(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    configScope: string;
    executionMode: string;
    providerPolicyMode: string;
    allowedProviders: string[];
    defaultProvider?: string | null;
    maxTaskBudgetLeaves?: number | string | null;
    monthlyBudgetLeaves?: number | string | null;
    modelPolicySummary?: string | null;
    secretPolicyReference?: string | null;
    notes?: string | null;
    ownerOnlyEnforced?: boolean | null;
    internalOnlyEnforced?: boolean | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const nextConfigScope = parseProjectRuntimeConfigScope(input.configScope);
  const nextExecutionMode = parseProjectRuntimeExecutionMode(input.executionMode);
  const nextProviderPolicyMode = parseProjectRuntimeProviderPolicyMode(
    input.providerPolicyMode,
  );
  const nextAllowedProviders = parseProjectRuntimeProviderKeys(
    input.allowedProviders,
  );
  const nextDefaultProvider = parseProjectRuntimeProviderKey(
    input.defaultProvider,
  );
  const nextMaxTaskBudgetLeaves = normalizeOptionalLeavesBudget(
    input.maxTaskBudgetLeaves,
  );
  const nextMonthlyBudgetLeaves = normalizeOptionalLeavesBudget(
    input.monthlyBudgetLeaves,
  );
  const nextModelPolicySummary = normalizeRuntimePolicyText(
    input.modelPolicySummary,
  );
  const nextSecretPolicyReference = normalizeRuntimePolicyReference(
    input.secretPolicyReference,
  );
  const nextNotes = normalizeRuntimePolicyText(input.notes);
  const nextOwnerOnlyEnforced = Boolean(input.ownerOnlyEnforced);
  const nextInternalOnlyEnforced = Boolean(input.internalOnlyEnforced);

  if (!runtimeId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id is required before saving runtime config policy.",
    };
  }

  if (!nextConfigScope || !nextExecutionMode || !nextProviderPolicyMode) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Select a valid runtime config scope, execution mode, and provider policy before saving.",
    };
  }

  if (nextDefaultProvider && !nextAllowedProviders.includes(nextDefaultProvider)) {
    return {
      ok: false as const,
      status: 400,
      error:
        "The default provider must also exist in the runtime allowlist before saving.",
    };
  }

  if (
    nextMaxTaskBudgetLeaves !== null &&
    nextMonthlyBudgetLeaves !== null &&
    nextMaxTaskBudgetLeaves > nextMonthlyBudgetLeaves
  ) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Per-task budget cannot exceed the configured monthly budget guardrail.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const currentRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        select: {
          id: true,
          accessPolicy: true,
          target: true,
          configPolicy: {
            select: {
              id: true,
              configScope: true,
              executionMode: true,
              providerPolicyMode: true,
              allowedProviders: true,
              defaultProvider: true,
              maxTaskBudgetLeaves: true,
              monthlyBudgetLeaves: true,
              modelPolicySummary: true,
              secretPolicyReference: true,
              notes: true,
              ownerOnlyEnforced: true,
              internalOnlyEnforced: true,
            },
          },
        },
      });

      if (!currentRuntime) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested runtime record could not be found.",
        };
      }

      const currentPolicy = currentRuntime.configPolicy;
      const providerListChanged =
        !currentPolicy ||
        !areProviderListsEqual(currentPolicy.allowedProviders, nextAllowedProviders);
      const policyChanged =
        !currentPolicy ||
        currentPolicy.configScope !== nextConfigScope ||
        currentPolicy.executionMode !== nextExecutionMode ||
        currentPolicy.providerPolicyMode !== nextProviderPolicyMode ||
        providerListChanged ||
        currentPolicy.defaultProvider !== nextDefaultProvider ||
        currentPolicy.maxTaskBudgetLeaves !== nextMaxTaskBudgetLeaves ||
        currentPolicy.monthlyBudgetLeaves !== nextMonthlyBudgetLeaves ||
        (currentPolicy.modelPolicySummary ?? null) !== nextModelPolicySummary ||
        (currentPolicy.secretPolicyReference ?? null) !==
          nextSecretPolicyReference ||
        (currentPolicy.notes ?? null) !== nextNotes ||
        currentPolicy.ownerOnlyEnforced !== nextOwnerOnlyEnforced ||
        currentPolicy.internalOnlyEnforced !== nextInternalOnlyEnforced;

      if (!policyChanged) {
        const unchangedRuntime = await transaction.projectRuntime.findUnique({
          where: {
            id: runtimeId,
          },
          include: projectRuntimeRegistryInclude,
        });

        if (!unchangedRuntime) {
          throw new Error(
            "Eden could not reload the runtime record after a no-op config policy update.",
          );
        }

        return {
          ok: true as const,
          changed: false,
          runtime: mapProjectRuntimeRecord(unchangedRuntime),
        };
      }

      const configPolicyData = {
        configScope: nextConfigScope,
        executionMode: nextExecutionMode,
        providerPolicyMode: nextProviderPolicyMode,
        allowedProviders: nextAllowedProviders,
        defaultProvider: nextDefaultProvider,
        maxTaskBudgetLeaves: nextMaxTaskBudgetLeaves,
        monthlyBudgetLeaves: nextMonthlyBudgetLeaves,
        modelPolicySummary: nextModelPolicySummary,
        secretPolicyReference: nextSecretPolicyReference,
        notes: nextNotes,
        ownerOnlyEnforced: nextOwnerOnlyEnforced,
        internalOnlyEnforced: nextInternalOnlyEnforced,
      } satisfies Omit<
        Prisma.ProjectRuntimeConfigPolicyUncheckedCreateInput,
        "id" | "runtimeId"
      >;

      if (currentPolicy) {
        await transaction.projectRuntimeConfigPolicy.update({
          where: {
            runtimeId,
          },
          data: configPolicyData,
        });
      } else {
        await transaction.projectRuntimeConfigPolicy.create({
          data: {
            runtimeId,
            ...configPolicyData,
          },
        });
      }

      await syncProjectRuntimeSecretBoundaries(transaction, {
        runtimeId,
        runtimeAccessPolicy: currentRuntime.accessPolicy,
        runtimeTarget: currentRuntime.target,
        allowedProviders: nextAllowedProviders,
        ownerOnlyEnforced: nextOwnerOnlyEnforced,
        internalOnlyEnforced: nextInternalOnlyEnforced,
      });
      await syncProjectRuntimeProviderApprovals(transaction, {
        runtimeId,
        actorUserId: actor.id,
        allowedProviders: nextAllowedProviders,
      });

      const auditEntries = buildRuntimeConfigAuditEntries({
        runtimeId,
        actorUserId: actor.id,
        currentPolicy,
        nextPolicy: {
          configScope: nextConfigScope,
          executionMode: nextExecutionMode,
          providerPolicyMode: nextProviderPolicyMode,
          allowedProviders: nextAllowedProviders,
          defaultProvider: nextDefaultProvider,
          maxTaskBudgetLeaves: nextMaxTaskBudgetLeaves,
          monthlyBudgetLeaves: nextMonthlyBudgetLeaves,
          modelPolicySummary: nextModelPolicySummary,
          secretPolicyReference: nextSecretPolicyReference,
          notes: nextNotes,
          ownerOnlyEnforced: nextOwnerOnlyEnforced,
          internalOnlyEnforced: nextInternalOnlyEnforced,
        },
      });

      if (auditEntries.length) {
        await transaction.projectRuntimeAuditLog.createMany({
          data: auditEntries,
        });
      }

      const updatedRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        include: projectRuntimeRegistryInclude,
      });

      if (!updatedRuntime) {
        throw new Error(
          "Eden could not reload the runtime record after saving config policy changes.",
        );
      }

      return {
        ok: true as const,
        changed: true,
        runtime: mapProjectRuntimeRecord(updatedRuntime),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure("update_owner_project_runtime_config_policy", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
    };
  }
}

export async function updateOwnerProjectRuntimeProviderApproval(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    providerKey: string;
    approvalStatus: string;
    modelScope?: string[] | null;
    capabilityScope?: string[] | null;
    notes?: string | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const providerKey = parseProjectRuntimeProviderKey(input.providerKey);
  const approvalStatus = parseProjectRuntimeProviderApprovalStatus(
    input.approvalStatus,
  );
  const nextModelScope = normalizeRuntimeScopeList(input.modelScope);
  const nextCapabilityScope = normalizeRuntimeScopeList(input.capabilityScope);
  const nextNotes = normalizeRuntimePolicyText(input.notes);

  if (!runtimeId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id is required before saving provider approvals.",
    };
  }

  if (!providerKey || !approvalStatus) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Select a valid provider and approval state before saving provider approval metadata.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const currentRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        select: {
          id: true,
          configPolicy: {
            select: {
              allowedProviders: true,
            },
          },
          providerApprovals: {
            where: {
              providerKey,
            },
            take: 1,
            select: {
              id: true,
              approvalStatus: true,
              modelScope: true,
              capabilityScope: true,
              notes: true,
            },
          },
        },
      });

      if (!currentRuntime) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested runtime record could not be found.",
        };
      }

      const isAllowlisted =
        !currentRuntime.configPolicy ||
        currentRuntime.configPolicy.allowedProviders.includes(providerKey);

      if (!isAllowlisted) {
        return {
          ok: false as const,
          status: 400,
          error:
            "Add the provider to the runtime allowlist before changing its approval gate.",
        };
      }

      const currentApproval = currentRuntime.providerApprovals[0] ?? null;
      const approvalChanged =
        !currentApproval ||
        currentApproval.approvalStatus !== approvalStatus ||
        !areScopedListsEqual(currentApproval.modelScope, nextModelScope) ||
        !areScopedListsEqual(
          currentApproval.capabilityScope,
          nextCapabilityScope,
        ) ||
        (currentApproval.notes ?? null) !== nextNotes;

      if (!approvalChanged) {
        const unchangedRuntime = await transaction.projectRuntime.findUnique({
          where: {
            id: runtimeId,
          },
          include: projectRuntimeRegistryInclude,
        });

        if (!unchangedRuntime) {
          throw new Error(
            "Eden could not reload the runtime record after a no-op provider approval update.",
          );
        }

        return {
          ok: true as const,
          changed: false,
          runtime: mapProjectRuntimeRecord(unchangedRuntime),
        };
      }

      await transaction.projectRuntimeProviderApproval.upsert({
        where: {
          runtimeId_providerKey: {
            runtimeId,
            providerKey,
          },
        },
        update: {
          actorUserId: actor.id,
          approvalStatus,
          modelScope: nextModelScope,
          capabilityScope: nextCapabilityScope,
          notes: nextNotes,
          reviewedAt: new Date(),
        },
        create: {
          runtimeId,
          actorUserId: actor.id,
          providerKey,
          approvalStatus,
          modelScope: nextModelScope,
          capabilityScope: nextCapabilityScope,
          notes: nextNotes,
          reviewedAt: new Date(),
        },
      });

      await transaction.projectRuntimeAuditLog.createMany({
        data: buildProviderApprovalAuditEntries({
          runtimeId,
          actorUserId: actor.id,
          providerKey,
          currentApproval,
          nextApproval: {
            approvalStatus,
            modelScope: nextModelScope,
            capabilityScope: nextCapabilityScope,
            notes: nextNotes,
          },
        }),
      });

      const updatedRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        include: projectRuntimeRegistryInclude,
      });

      if (!updatedRuntime) {
        throw new Error(
          "Eden could not reload the runtime record after saving provider approval metadata.",
        );
      }

      return {
        ok: true as const,
        changed: true,
        runtime: mapProjectRuntimeRecord(updatedRuntime),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure("update_owner_project_runtime_provider_approval", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
    };
  }
}

export async function updateOwnerProjectRuntimeSecretBoundaryStatus(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    boundaryId: string;
    status: string;
    statusDetail?: string | null;
    lastCheckedAction?: string | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const boundaryId = input.boundaryId.trim();
  const nextStatus = parseProjectRuntimeSecretStatus(input.status);
  const nextStatusDetail = normalizeRuntimePolicyText(input.statusDetail);
  const lastCheckedAction = normalizeRuntimeHealthCheckAction(
    input.lastCheckedAction,
  );

  if (!runtimeId || !boundaryId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id and boundary id are required before saving secret status.",
    };
  }

  if (!nextStatus || !lastCheckedAction) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Select a valid secret readiness state and last-checked action before saving.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const currentBoundary = await transaction.projectRuntimeSecretBoundary.findUnique(
        {
          where: {
            id: boundaryId,
          },
          select: {
            id: true,
            runtimeId: true,
            label: true,
            status: true,
            statusDetail: true,
            lastCheckedAt: true,
          },
        },
      );

      if (!currentBoundary || currentBoundary.runtimeId !== runtimeId) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested secret-boundary record could not be found.",
        };
      }

      const boundaryChanges: Prisma.ProjectRuntimeSecretBoundaryUpdateInput = {};
      const auditEntries: Prisma.ProjectRuntimeAuditLogCreateManyInput[] = [];

      if (currentBoundary.status !== nextStatus) {
        boundaryChanges.status = nextStatus;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: `secretBoundaryStatus:${currentBoundary.label}`,
            previousValue: currentBoundary.status,
            nextValue: nextStatus,
            detail: `Updated secret-boundary readiness for ${currentBoundary.label}.`,
          }),
        );
      }

      if ((currentBoundary.statusDetail ?? null) !== nextStatusDetail) {
        boundaryChanges.statusDetail = nextStatusDetail;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: `secretBoundaryDetail:${currentBoundary.label}`,
            previousValue: currentBoundary.statusDetail,
            nextValue: nextStatusDetail,
            detail: `Updated secret-boundary detail for ${currentBoundary.label}.`,
          }),
        );
      }

      if (lastCheckedAction === "set_now") {
        const lastCheckedAt = new Date();
        boundaryChanges.lastCheckedAt = lastCheckedAt;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: `secretBoundaryChecked:${currentBoundary.label}`,
            previousValue: currentBoundary.lastCheckedAt?.toISOString() ?? null,
            nextValue: lastCheckedAt.toISOString(),
            detail: `Recorded a secret-boundary readiness check for ${currentBoundary.label}.`,
          }),
        );
      }

      if (lastCheckedAction === "clear" && currentBoundary.lastCheckedAt) {
        boundaryChanges.lastCheckedAt = null;
        auditEntries.push(
          buildProjectRuntimeAuditEntry({
            runtimeId,
            actorUserId: actor.id,
            fieldName: `secretBoundaryChecked:${currentBoundary.label}`,
            previousValue: currentBoundary.lastCheckedAt.toISOString(),
            nextValue: null,
            detail: `Cleared the recorded secret-boundary readiness check for ${currentBoundary.label}.`,
          }),
        );
      }

      if (!auditEntries.length) {
        const unchangedRuntime = await transaction.projectRuntime.findUnique({
          where: {
            id: runtimeId,
          },
          include: projectRuntimeRegistryInclude,
        });

        if (!unchangedRuntime) {
          throw new Error(
            "Eden could not reload the runtime record after a no-op secret-boundary update.",
          );
        }

        return {
          ok: true as const,
          changed: false,
          runtime: mapProjectRuntimeRecord(unchangedRuntime),
        };
      }

      await transaction.projectRuntimeSecretBoundary.update({
        where: {
          id: boundaryId,
        },
        data: boundaryChanges,
      });

      await transaction.projectRuntimeAuditLog.createMany({
        data: auditEntries,
      });

      const updatedRuntime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        include: projectRuntimeRegistryInclude,
      });

      if (!updatedRuntime) {
        throw new Error(
          "Eden could not reload the runtime record after saving secret-boundary metadata.",
        );
      }

      return {
        ok: true as const,
        changed: true,
        runtime: mapProjectRuntimeRecord(updatedRuntime),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure(
      "update_owner_project_runtime_secret_boundary_status",
      error,
    );

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
    };
  }
}

export async function loadOwnerProjectRuntimeDeploymentHistory(runtimeId: string) {
  const normalizedRuntimeId = runtimeId.trim();

  if (!normalizedRuntimeId) {
    return {
      records: [] as EdenProjectRuntimeDeploymentRecord[],
      unavailableReason: "Runtime id is required before loading deployment history.",
      runtimeMissing: false,
    };
  }

  try {
    const prisma = getPrismaClient();
    const runtime = await prisma.projectRuntime.findUnique({
      where: {
        id: normalizedRuntimeId,
      },
      select: {
        id: true,
      },
    });

    if (!runtime) {
      return {
        records: [] as EdenProjectRuntimeDeploymentRecord[],
        unavailableReason: null,
        runtimeMissing: true,
      };
    }

    const records = await prisma.projectRuntimeDeploymentRecord.findMany({
      where: {
        runtimeId: normalizedRuntimeId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        actorUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return {
      records: records.map(mapProjectRuntimeDeploymentRecord),
      unavailableReason: null,
      runtimeMissing: false,
    };
  } catch (error) {
    logProjectRuntimeFailure("load_owner_project_runtime_deployment_history", error);

    return {
      records: [] as EdenProjectRuntimeDeploymentRecord[],
      unavailableReason: describeProjectRuntimeFailure(error),
      runtimeMissing: false,
    };
  }
}

export async function addOwnerProjectRuntimeDeploymentRecord(
  actor: EdenProjectRuntimeActor,
  input: {
    runtimeId: string;
    eventType: string;
    eventStatus: string;
    summary: string;
    detail?: string | null;
  },
) {
  const prisma = getPrismaClient();
  const runtimeId = input.runtimeId.trim();
  const eventType = parseProjectRuntimeDeploymentEventType(input.eventType);
  const eventStatus = parseProjectRuntimeDeploymentEventStatus(input.eventStatus);
  const summary = normalizeDeploymentSummary(input.summary);
  const detail = normalizeDeploymentDetail(input.detail);

  if (!runtimeId) {
    return {
      ok: false as const,
      status: 400,
      error: "Runtime id is required before adding a deployment history record.",
    };
  }

  if (!eventType || !eventStatus) {
    return {
      ok: false as const,
      status: 400,
      error: "Select a valid deployment event type and result before saving.",
    };
  }

  if (!summary || summary.length < 8) {
    return {
      ok: false as const,
      status: 400,
      error: "Enter a clearer deployment history summary before saving.",
    };
  }

  try {
    return prisma.$transaction(async (transaction) => {
      await upsertProjectRuntimeActor(transaction, actor);

      const runtime = await transaction.projectRuntime.findUnique({
        where: {
          id: runtimeId,
        },
        select: {
          id: true,
        },
      });

      if (!runtime) {
        return {
          ok: false as const,
          status: 404,
          error: "The requested runtime record could not be found.",
        };
      }

      const record = await transaction.projectRuntimeDeploymentRecord.create({
        data: {
          runtimeId,
          actorUserId: actor.id,
          eventType,
          eventStatus,
          summary,
          detail,
        },
        include: {
          actorUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return {
        ok: true as const,
        record: mapProjectRuntimeDeploymentRecord(record),
      };
    });
  } catch (error) {
    logProjectRuntimeFailure("add_owner_project_runtime_deployment_record", error);

    return {
      ok: false as const,
      status: 503,
      error: describeProjectRuntimeFailure(error),
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
    providerKey?: string | null;
    modelLabel?: string | null;
    requestedActionType?: string | null;
    executionRole?: string | null;
    adapterKey?: string | null;
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
        name: true,
        accessPolicy: true,
        runtimeType: true,
        target: true,
        visibility: true,
        configPolicy: {
          select: {
            executionMode: true,
            providerPolicyMode: true,
            allowedProviders: true,
            ownerOnlyEnforced: true,
            internalOnlyEnforced: true,
          },
        },
        secretBoundaries: {
          select: {
            providerKey: true,
            status: true,
            isRequired: true,
          },
        },
        providerApprovals: {
          select: {
            providerKey: true,
            approvalStatus: true,
            modelScope: true,
            capabilityScope: true,
          },
        },
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
    const providerKey = parseProjectRuntimeProviderKey(input.providerKey);
    const modelLabel = normalizeSandboxTaskTitle(input.modelLabel);
    const requestedActionType =
      parseProjectRuntimeAgentActionType(input.requestedActionType) ??
      (providerKey ? "PROVIDER_PREFLIGHT" : resolveSandboxTaskRequestedAction(taskType));
    const executionRole =
      parseProjectRuntimeExecutionRole(input.executionRole) ??
      resolveSandboxExecutionRole({
        taskType,
        providerKey,
        requestedActionType,
      });
    const adapterKey =
      parseProjectRuntimeExecutionAdapterKey(input.adapterKey) ??
      resolveSandboxExecutionAdapterKey({
        providerKey,
        requestedActionType,
      });
    const taskTitle =
      normalizeSandboxTaskTitle(input.title) ?? buildSandboxTaskTitle(normalizedInput);
    const executionGovernanceSnapshot = buildRuntimeExecutionGovernanceSnapshot(
      runtime,
    );
    const dispatchPreflight = buildRuntimeExecutionDispatchPreflight({
      snapshot: executionGovernanceSnapshot,
      adapterKey,
      providerKey: providerKey?.toLowerCase() ?? null,
    });
    const providerPreflight = dispatchPreflight?.providerPreflight ?? null;

    const createdTask = await prisma.projectRuntimeTask.create({
      data: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        creatorUserId: actor.id,
        title: taskTitle,
        inputText: normalizedInput,
        providerKey,
        modelLabel,
        requestedActionType,
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
      providerPreflight,
      dispatchPreflight,
    });
    const taskResult = buildSandboxTaskResult({
      taskType,
      providerPreflight,
      requestedActionType,
      workerPayload: workerPayload.payload,
    });
    const workerCompletedAt = new Date();

    await prisma.projectRuntimeTask.update({
      where: {
        id: createdTask.id,
      },
      data: {
        status: "COMPLETED",
        workerSummary: workerPayload.summary,
        workerPayload: workerPayload.payload,
        outputSummary: workerPayload.outputSummary,
        outputLines: workerPayload.outputLines,
        resultType: taskResult.resultType,
        resultStatus: taskResult.resultStatus,
        resultSummary: taskResult.resultSummary,
        resultPayload: taskResult.resultPayload,
        workerCompletedAt,
        completedAt: workerCompletedAt,
      },
      include: projectRuntimeTaskInclude,
    });

    const executionSession = dispatchPreflight
      ? await prisma.projectRuntimeExecutionSession.create({
          data: {
            runtimeId: edenOwnerInternalSandboxRuntimeId,
            actorUserId: actor.id,
            sessionLabel: buildSandboxExecutionSessionLabel({
              taskTitle: createdTask.title,
              executionRole,
              adapterKey: dispatchPreflight.adapterKey,
            }),
            sessionType: resolveSandboxExecutionSessionType(
              dispatchPreflight.adapterKind,
            ),
            executionRole,
            adapterKind: mapDispatchAdapterKindToSchemaValue(
              dispatchPreflight.adapterKind,
            ),
            adapterMode: mapDispatchAdapterModeToSchemaValue(
              dispatchPreflight.adapterMode,
            ),
            providerKey,
            status: mapDispatchStatusToExecutionSessionStatus(
              dispatchPreflight.dispatchStatus,
            ),
            allowedCapabilities: dispatchPreflight.capabilityLabels,
            ownerOnly: true,
            internalOnly: true,
            notes: dispatchPreflight.detail,
          },
        })
      : null;

    const dispatchRecord = dispatchPreflight
      ? await prisma.projectRuntimeDispatchRecord.create({
          data: {
            runtimeId: edenOwnerInternalSandboxRuntimeId,
            taskId: createdTask.id,
            actorUserId: actor.id,
            sessionId: executionSession?.id ?? null,
            providerKey,
            modelLabel,
            dispatchStatus: mapDispatchStatusToSchemaValue(
              dispatchPreflight.dispatchStatus,
            ),
            dispatchMode: resolveSandboxDispatchMode(dispatchPreflight),
            executionRole,
            adapterKind: mapDispatchAdapterKindToSchemaValue(
              dispatchPreflight.adapterKind,
            ),
            adapterKey: dispatchPreflight.adapterKey,
            adapterMode: mapDispatchAdapterModeToSchemaValue(
              dispatchPreflight.adapterMode,
            ),
            summary: dispatchPreflight.summary,
            detail: dispatchPreflight.detail,
            dispatchReason: dispatchPreflight.dispatchReason,
            blockingReason: dispatchPreflight.blockingReason,
            reviewRequired: dispatchPreflight.reviewRequired,
            resultPayload: buildSandboxDispatchResultPayload({
              dispatchPreflight,
              requestedActionType,
            }),
          },
        })
      : null;

    const runSummary = dispatchPreflight
      ? dispatchPreflight.summary
      : `${edenInternalSandboxWorkerAgentLabel} recorded a deterministic sandbox control-plane run.`;
    const runDetail = dispatchPreflight
      ? dispatchPreflight.detail
      : "The internal sandbox task runner stored planner and worker records only. No live provider call, tool execution, browser automation, or hosted runtime action occurred.";
    const runStatus = dispatchPreflight
      ? mapDispatchPreflightToAgentRunStatus(dispatchPreflight.dispatchStatus)
      : ("PREPARED" satisfies ProjectRuntimeAgentRunStatusValue);

    await prisma.projectRuntimeAgentRun.create({
      data: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        taskId: createdTask.id,
        actorUserId: actor.id,
        providerKey,
        modelLabel,
        executionTargetLabel: runtime.name,
        requestedActionType,
        runStatus,
        summary: runSummary,
        detail: runDetail,
        resultPayload:
          dispatchRecord?.resultPayload ?? taskResult.resultPayload,
        completedAt: runStatus === "COMPLETED" ? workerCompletedAt : null,
      },
    });

    const reloadedTask = await prisma.projectRuntimeTask.findUnique({
      where: {
        id: createdTask.id,
      },
      include: projectRuntimeTaskInclude,
    });

    if (!reloadedTask) {
      throw new Error(
        "Eden could not reload the sandbox task after recording its governed execution result.",
      );
    }

    return {
      ok: true as const,
      task: mapProjectRuntimeTaskRecord(reloadedTask),
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
            resultType: "EXECUTION_REVIEW",
            resultStatus: "FAIL",
            resultSummary:
              "Sandbox task execution failed before Eden could complete its governed control-plane record.",
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

    const existingLaunchIntent = await transaction.projectRuntimeLaunchIntent.findUnique(
      {
        where: {
          runtimeId: edenOwnerInternalSandboxRuntimeId,
        },
        select: {
          id: true,
        },
      },
    );

    if (!existingLaunchIntent) {
      await transaction.projectRuntimeLaunchIntent.create({
        data: {
          runtimeId: edenOwnerInternalSandboxRuntimeId,
          intentType: "INTERNAL_PREVIEW",
          intendedTarget: "EDEN_INTERNAL",
          launchMode: "CONTROL_PLANE_ONLY",
          destinationLabel: "sandbox.eden.internal/owner-sandbox",
          notes:
            "Metadata only. The internal sandbox is reserved as an owner-only preview intent until real runtime provisioning exists.",
        },
      });
    }

    const existingConfigPolicy =
      await transaction.projectRuntimeConfigPolicy.findUnique({
        where: {
          runtimeId: edenOwnerInternalSandboxRuntimeId,
        },
        select: {
          id: true,
        },
      });

    if (!existingConfigPolicy) {
      await transaction.projectRuntimeConfigPolicy.create({
        data: {
          runtimeId: edenOwnerInternalSandboxRuntimeId,
          configScope: "OWNER_INTERNAL",
          executionMode: "SANDBOX_TASK_RUNNER_V1",
          providerPolicyMode: "EDEN_APPROVED_ONLY",
          allowedProviders: ["OPENAI", "ANTHROPIC"],
          defaultProvider: "OPENAI",
          maxTaskBudgetLeaves: 250,
          monthlyBudgetLeaves: 2500,
          modelPolicySummary:
            "Owner-aligned Eden sandbox planning and review only. Provider execution remains scaffolded until approved adapters and runtime boundaries are implemented.",
          secretPolicyReference: "owner_internal_provider_credentials",
          notes:
            "Metadata only. This config policy does not unlock live provider execution or runtime autonomy.",
          ownerOnlyEnforced: true,
          internalOnlyEnforced: true,
        },
      });
    }

    await syncProjectRuntimeSecretBoundaries(transaction, {
      runtimeId: edenOwnerInternalSandboxRuntimeId,
      runtimeAccessPolicy: "OWNER_ONLY",
      runtimeTarget: "EDEN_INTERNAL",
      allowedProviders: ["OPENAI", "ANTHROPIC"],
      ownerOnlyEnforced: true,
      internalOnlyEnforced: true,
    });
    await syncProjectRuntimeProviderApprovals(transaction, {
      runtimeId: edenOwnerInternalSandboxRuntimeId,
      actorUserId: actor.id,
      allowedProviders: ["OPENAI", "ANTHROPIC"],
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
    launchIntent: runtime.launchIntent
      ? mapProjectRuntimeLaunchIntentRecord(runtime.launchIntent)
      : null,
    configPolicy: runtime.configPolicy
      ? mapProjectRuntimeConfigRecord(runtime.configPolicy)
      : null,
    secretBoundaries: runtime.secretBoundaries.map(
      mapProjectRuntimeSecretBoundaryRecord,
    ),
    providerCompatibility: evaluateRuntimeProviderCompatibility({
      executionMode: runtime.configPolicy?.executionMode.toLowerCase() ?? null,
      providerPolicyMode:
        runtime.configPolicy?.providerPolicyMode.toLowerCase() ?? null,
      allowedProviders:
        runtime.configPolicy?.allowedProviders.map((provider) =>
          provider.toLowerCase(),
        ) ?? [],
      providerApprovals: runtime.providerApprovals.map((approval) => ({
        providerKey: approval.providerKey.toLowerCase(),
        approvalStatus: approval.approvalStatus.toLowerCase(),
        modelScope: approval.modelScope,
        capabilityScope: approval.capabilityScope,
      })),
      secretBoundaries: runtime.secretBoundaries.map((boundary) => ({
        providerKey: boundary.providerKey?.toLowerCase() ?? null,
        status: boundary.status.toLowerCase(),
        isRequired: boundary.isRequired,
      })),
    }).map(
      (
        compatibility,
      ): EdenProjectRuntimeProviderCompatibilityRecord => ({
        providerKey: compatibility.providerKey,
        providerLabel: compatibility.providerLabel,
        adapterStatus: compatibility.adapterStatus,
        adapterStatusLabel: compatibility.adapterStatusLabel,
        compatibilityStatus: compatibility.compatibilityStatus,
        compatibilityStatusLabel: compatibility.compatibilityStatusLabel,
        capabilityLabels: compatibility.capabilityLabels,
        reason: compatibility.reason,
      }),
    ),
    providerApprovals: runtime.providerApprovals.map(
      mapProjectRuntimeProviderApprovalRecord,
    ),
    agentRuns: runtime.agentRuns.map(mapProjectRuntimeAgentRunRecord),
    executionSessions: runtime.executionSessions.map(
      mapProjectRuntimeExecutionSessionRecord,
    ),
    dispatchHistory: runtime.dispatchRecords.map(
      mapProjectRuntimeDispatchRecord,
    ),
    auditEntries: runtime.auditLogs.map(mapProjectRuntimeAuditLogRecord),
    deploymentHistory: runtime.deploymentRecords.map(
      mapProjectRuntimeDeploymentRecord,
    ),
  };
}

function mapProjectRuntimeLaunchIntentRecord(
  intent: NonNullable<ProjectRuntimeRegistryRecord["launchIntent"]>,
): EdenProjectRuntimeLaunchIntentRecord {
  return {
    id: intent.id,
    intentType: intent.intentType.toLowerCase(),
    intentTypeLabel: formatEnumLabel(intent.intentType),
    intendedTarget: intent.intendedTarget.toLowerCase(),
    intendedTargetLabel: formatEnumLabel(intent.intendedTarget),
    launchMode: intent.launchMode.toLowerCase(),
    launchModeLabel: formatEnumLabel(intent.launchMode),
    destinationLabel: intent.destinationLabel,
    notes: intent.notes,
    createdAtLabel: formatTimestamp(intent.createdAt),
    updatedAtLabel: formatTimestamp(intent.updatedAt),
  };
}

function mapProjectRuntimeConfigRecord(
  configPolicy: NonNullable<ProjectRuntimeRegistryRecord["configPolicy"]>,
): EdenProjectRuntimeConfigRecord {
  return {
    id: configPolicy.id,
    configScope: configPolicy.configScope.toLowerCase(),
    configScopeLabel: formatEnumLabel(configPolicy.configScope),
    executionMode: configPolicy.executionMode.toLowerCase(),
    executionModeLabel: formatEnumLabel(configPolicy.executionMode),
    providerPolicyMode: configPolicy.providerPolicyMode.toLowerCase(),
    providerPolicyModeLabel: formatEnumLabel(configPolicy.providerPolicyMode),
    allowedProviders: configPolicy.allowedProviders.map((provider) =>
      provider.toLowerCase(),
    ),
    allowedProviderLabels: configPolicy.allowedProviders.map((provider) =>
      formatEnumLabel(provider),
    ),
    defaultProvider: configPolicy.defaultProvider?.toLowerCase() ?? null,
    defaultProviderLabel: configPolicy.defaultProvider
      ? formatEnumLabel(configPolicy.defaultProvider)
      : null,
    maxTaskBudgetLeaves: configPolicy.maxTaskBudgetLeaves,
    monthlyBudgetLeaves: configPolicy.monthlyBudgetLeaves,
    modelPolicySummary: configPolicy.modelPolicySummary,
    secretPolicyReference: configPolicy.secretPolicyReference,
    notes: configPolicy.notes,
    ownerOnlyEnforced: configPolicy.ownerOnlyEnforced,
    internalOnlyEnforced: configPolicy.internalOnlyEnforced,
    createdAtLabel: formatTimestamp(configPolicy.createdAt),
    updatedAtLabel: formatTimestamp(configPolicy.updatedAt),
  };
}

function mapProjectRuntimeSecretBoundaryRecord(
  boundary: ProjectRuntimeRegistryRecord["secretBoundaries"][number],
): EdenProjectRuntimeSecretBoundaryRecord {
  return {
    id: boundary.id,
    label: boundary.label,
    description: boundary.description,
    secretType: boundary.secretType.toLowerCase(),
    secretTypeLabel: formatEnumLabel(boundary.secretType),
    secretScope: boundary.secretScope.toLowerCase(),
    secretScopeLabel: formatEnumLabel(boundary.secretScope),
    visibilityPolicy: boundary.visibilityPolicy.toLowerCase(),
    visibilityPolicyLabel: formatEnumLabel(boundary.visibilityPolicy),
    status: boundary.status.toLowerCase(),
    statusLabel: formatEnumLabel(boundary.status),
    isRequired: boundary.isRequired,
    providerKey: boundary.providerKey?.toLowerCase() ?? null,
    providerLabel: boundary.providerKey
      ? formatEnumLabel(boundary.providerKey)
      : null,
    boundaryReference: boundary.boundaryReference,
    statusDetail: boundary.statusDetail,
    lastCheckedAtLabel: boundary.lastCheckedAt
      ? formatTimestamp(boundary.lastCheckedAt)
      : null,
    updatedAtLabel: formatTimestamp(boundary.updatedAt),
  };
}

function mapProjectRuntimeProviderApprovalRecord(
  approval: ProjectRuntimeRegistryRecord["providerApprovals"][number],
): EdenProjectRuntimeProviderApprovalRecord {
  return {
    id: approval.id,
    providerKey: approval.providerKey.toLowerCase(),
    providerLabel: formatEnumLabel(approval.providerKey),
    approvalStatus: approval.approvalStatus.toLowerCase(),
    approvalStatusLabel: formatEnumLabel(approval.approvalStatus),
    modelScope: approval.modelScope,
    capabilityScope: approval.capabilityScope,
    notes: approval.notes,
    reviewedAtLabel: approval.reviewedAt
      ? formatTimestamp(approval.reviewedAt)
      : null,
    updatedAtLabel: formatTimestamp(approval.updatedAt),
    actorUserId: approval.actorUser.id,
    actorLabel: `${approval.actorUser.displayName} (@${approval.actorUser.username})`,
  };
}

function mapProjectRuntimeAgentRunRecord(
  run:
    | ProjectRuntimeRegistryRecord["agentRuns"][number]
    | ProjectRuntimeTaskReadRecord["agentRuns"][number],
): EdenProjectRuntimeAgentRunRecord {
  return {
    id: run.id,
    runtimeId: run.runtimeId,
    taskId: run.taskId,
    actorUserId: run.actorUser.id,
    actorLabel: `${run.actorUser.displayName} (@${run.actorUser.username})`,
    providerKey: run.providerKey?.toLowerCase() ?? null,
    providerLabel: run.providerKey ? formatEnumLabel(run.providerKey) : null,
    modelLabel: run.modelLabel,
    executionTargetLabel: run.executionTargetLabel,
    requestedActionType: run.requestedActionType.toLowerCase(),
    requestedActionTypeLabel: formatEnumLabel(run.requestedActionType),
    runStatus: run.runStatus.toLowerCase(),
    runStatusLabel: formatEnumLabel(run.runStatus),
    summary: run.summary,
    detail: run.detail,
    resultPayloadSummary: summarizeJsonPayload(run.resultPayload),
    errorDetail: run.errorDetail,
    createdAtLabel: formatTimestamp(run.createdAt),
    updatedAtLabel: formatTimestamp(run.updatedAt),
    completedAtLabel: run.completedAt ? formatTimestamp(run.completedAt) : null,
  };
}

function mapProjectRuntimeExecutionSessionRecord(
  session: ProjectRuntimeRegistryRecord["executionSessions"][number],
): EdenProjectRuntimeExecutionSessionRecord {
  return {
    id: session.id,
    actorUserId: session.actorUser.id,
    actorLabel: `${session.actorUser.displayName} (@${session.actorUser.username})`,
    sessionLabel: session.sessionLabel,
    sessionType: session.sessionType.toLowerCase(),
    sessionTypeLabel: formatEnumLabel(session.sessionType),
    executionRole: session.executionRole.toLowerCase(),
    executionRoleLabel: formatEnumLabel(session.executionRole),
    adapterKind: session.adapterKind.toLowerCase(),
    adapterKindLabel: formatEnumLabel(session.adapterKind),
    adapterMode: session.adapterMode.toLowerCase(),
    adapterModeLabel: formatEnumLabel(session.adapterMode),
    providerKey: session.providerKey?.toLowerCase() ?? null,
    providerLabel: session.providerKey ? formatEnumLabel(session.providerKey) : null,
    status: session.status.toLowerCase(),
    statusLabel: formatEnumLabel(session.status),
    allowedCapabilities: session.allowedCapabilities,
    ownerOnly: session.ownerOnly,
    internalOnly: session.internalOnly,
    notes: session.notes,
    createdAtLabel: formatTimestamp(session.createdAt),
    updatedAtLabel: formatTimestamp(session.updatedAt),
  };
}

function mapProjectRuntimeDispatchRecord(
  record:
    | ProjectRuntimeRegistryRecord["dispatchRecords"][number]
    | ProjectRuntimeTaskReadRecord["dispatchRecords"][number],
): EdenProjectRuntimeDispatchRecord {
  return {
    id: record.id,
    runtimeId: record.runtimeId,
    taskId: record.taskId,
    taskTitle: record.task?.title ?? null,
    actorUserId: record.actorUser.id,
    actorLabel: `${record.actorUser.displayName} (@${record.actorUser.username})`,
    sessionId: record.session?.id ?? null,
    sessionLabel: record.session?.sessionLabel ?? null,
    providerKey: record.providerKey?.toLowerCase() ?? null,
    providerLabel: record.providerKey ? formatEnumLabel(record.providerKey) : null,
    modelLabel: record.modelLabel,
    dispatchStatus: record.dispatchStatus.toLowerCase(),
    dispatchStatusLabel: formatEnumLabel(record.dispatchStatus),
    dispatchMode: record.dispatchMode.toLowerCase(),
    dispatchModeLabel: formatEnumLabel(record.dispatchMode),
    executionRole: record.executionRole.toLowerCase(),
    executionRoleLabel: formatEnumLabel(record.executionRole),
    adapterKind: record.adapterKind.toLowerCase(),
    adapterKindLabel: formatEnumLabel(record.adapterKind),
    adapterKey: record.adapterKey,
    adapterLabel: formatExecutionAdapterLabel(record.adapterKey),
    adapterMode: record.adapterMode.toLowerCase(),
    adapterModeLabel: formatEnumLabel(record.adapterMode),
    summary: record.summary,
    detail: record.detail,
    dispatchReason: record.dispatchReason,
    blockingReason: record.blockingReason,
    reviewRequired: record.reviewRequired,
    resultPayloadSummary: summarizeJsonPayload(record.resultPayload),
    preparedAtLabel: formatTimestamp(record.preparedAt),
    dispatchedAtLabel: record.dispatchedAt
      ? formatTimestamp(record.dispatchedAt)
      : null,
    completedAtLabel: record.completedAt
      ? formatTimestamp(record.completedAt)
      : null,
    createdAtLabel: formatTimestamp(record.createdAt),
    updatedAtLabel: formatTimestamp(record.updatedAt),
  };
}

function mapProjectRuntimeAuditLogRecord(
  entry: ProjectRuntimeRegistryRecord["auditLogs"][number],
): EdenProjectRuntimeAuditLogRecord {
  return {
    id: entry.id,
    fieldName: entry.fieldName,
    fieldLabel: formatProjectRuntimeAuditFieldLabel(entry.fieldName),
    previousValue: entry.previousValue,
    previousValueLabel: formatProjectRuntimeAuditValueLabel(
      entry.fieldName,
      entry.previousValue,
    ),
    nextValue: entry.nextValue,
    nextValueLabel: formatProjectRuntimeAuditValueLabel(
      entry.fieldName,
      entry.nextValue,
    ),
    detail: entry.detail,
    actorUserId: entry.actorUser.id,
    actorLabel: `${entry.actorUser.displayName} (@${entry.actorUser.username})`,
    createdAtLabel: formatTimestamp(entry.createdAt),
  };
}

function mapProjectRuntimeDeploymentRecord(
  record: ProjectRuntimeRegistryRecord["deploymentRecords"][number],
): EdenProjectRuntimeDeploymentRecord {
  return {
    id: record.id,
    eventType: record.eventType.toLowerCase(),
    eventTypeLabel: formatEnumLabel(record.eventType),
    eventStatus: record.eventStatus.toLowerCase(),
    eventStatusLabel: formatEnumLabel(record.eventStatus),
    summary: record.summary,
    detail: record.detail,
    actorUserId: record.actorUser.id,
    actorLabel: `${record.actorUser.displayName} (@${record.actorUser.username})`,
    createdAtLabel: formatTimestamp(record.createdAt),
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
    providerKey: task.providerKey?.toLowerCase() ?? null,
    providerLabel: task.providerKey ? formatEnumLabel(task.providerKey) : null,
    modelLabel: task.modelLabel,
    requestedActionType: task.requestedActionType?.toLowerCase() ?? null,
    requestedActionTypeLabel: task.requestedActionType
      ? formatEnumLabel(task.requestedActionType)
      : null,
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
    resultType: task.resultType?.toLowerCase() ?? null,
    resultTypeLabel: task.resultType ? formatEnumLabel(task.resultType) : null,
    resultStatus: task.resultStatus?.toLowerCase() ?? null,
    resultStatusLabel: task.resultStatus
      ? formatEnumLabel(task.resultStatus)
      : null,
    resultSummary: task.resultSummary,
    resultPayloadSummary: summarizeJsonPayload(task.resultPayload),
    failureDetail: task.failureDetail,
    agentRuns: task.agentRuns.map(mapProjectRuntimeAgentRunRecord),
    dispatchRecords: task.dispatchRecords.map(mapProjectRuntimeDispatchRecord),
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
  providerPreflight: ReturnType<typeof buildRuntimeProviderPreflight> | null;
  dispatchPreflight: EdenExecutionDispatchPreflightRecord | null;
}) {
  const actionPlan = buildWorkerActionPlan(input.inputText, input.plannerPayload);
  const implementationNotes = buildWorkerImplementationNotes(
    input.taskType,
    input.plannerPayload,
  );
  const artifacts = buildWorkerArtifacts(input.taskType, input.title, actionPlan);
  const executionNote =
    "Deterministic sandbox task runner only. Eden stored a planner record and worker result inside control-plane metadata without provisioning a real isolated runtime.";
  const providerPreflightLine = input.providerPreflight
    ? `Provider preflight: ${input.providerPreflight.summary}`
    : null;
  const dispatchPreflightLine = input.dispatchPreflight
    ? `Execution dispatch preflight: ${input.dispatchPreflight.summary}`
    : null;
  const outputSummary =
    input.providerPreflight
      ? "Sandbox provider preflight recorded."
      : input.dispatchPreflight &&
          input.dispatchPreflight.adapterKind === "browser"
        ? "Sandbox browser-dispatch preflight recorded."
      : input.dispatchPreflight &&
          input.dispatchPreflight.adapterKind === "tool"
        ? "Sandbox tool-dispatch preflight recorded."
      : input.taskType === "ANALYSIS"
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
      ...(dispatchPreflightLine ? [dispatchPreflightLine] : []),
      ...(providerPreflightLine ? [providerPreflightLine] : []),
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

function buildSandboxTaskResult(input: {
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW";
  providerPreflight: ReturnType<typeof buildRuntimeProviderPreflight> | null;
  requestedActionType: ProjectRuntimeAgentActionTypeValue;
  workerPayload: SandboxWorkerPayload;
}): {
  resultType: ProjectRuntimeTaskResultTypeValue;
  resultStatus: ProjectRuntimeTaskResultStatusValue;
  resultSummary: string;
  resultPayload: Prisma.JsonObject;
} {
  if (input.providerPreflight) {
    return {
      resultType: "PROVIDER_PREFLIGHT" satisfies ProjectRuntimeTaskResultTypeValue,
      resultStatus: input.providerPreflight.ready
        ? ("PASS" satisfies ProjectRuntimeTaskResultStatusValue)
        : input.providerPreflight.compatibilityStatus === "approval_required"
          ? ("REVIEW_NEEDED" satisfies ProjectRuntimeTaskResultStatusValue)
          : ("FAIL" satisfies ProjectRuntimeTaskResultStatusValue),
      resultSummary: input.providerPreflight.ready
        ? `${input.providerPreflight.providerLabel} governance preflight passed. Live provider execution was not attempted.`
        : input.providerPreflight.summary,
      resultPayload: {
        resultKind: "provider_preflight",
        requestedActionType: input.requestedActionType,
        providerKey: input.providerPreflight.providerKey,
        providerLabel: input.providerPreflight.providerLabel,
        compatibilityStatus: input.providerPreflight.compatibilityStatus,
        ready: input.providerPreflight.ready,
        detail: input.providerPreflight.detail,
      } satisfies Prisma.JsonObject,
    };
  }

  if (input.taskType === "QA_REVIEW") {
    return {
      resultType: "QA_RESULT" satisfies ProjectRuntimeTaskResultTypeValue,
      resultStatus: "REVIEW_NEEDED" satisfies ProjectRuntimeTaskResultStatusValue,
      resultSummary:
        "Sandbox QA review metadata was recorded. Review is still required before any promotion or real execution step.",
      resultPayload: {
        resultKind: "qa_review",
        requestedActionType: input.requestedActionType,
        executionNote: input.workerPayload.executionNote,
      } satisfies Prisma.JsonObject,
    };
  }

  return {
    resultType: "SANDBOX_PLAN" satisfies ProjectRuntimeTaskResultTypeValue,
    resultStatus: "INFO" satisfies ProjectRuntimeTaskResultStatusValue,
    resultSummary:
      "Sandbox planner and worker output were stored as a control-plane record only.",
    resultPayload: {
      resultKind: "sandbox_plan",
      requestedActionType: input.requestedActionType,
      executionNote: input.workerPayload.executionNote,
    } satisfies Prisma.JsonObject,
  };
}

function resolveSandboxTaskRequestedAction(
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW",
): ProjectRuntimeAgentActionTypeValue {
  if (taskType === "QA_REVIEW") {
    return "QA_VALIDATION";
  }

  if (taskType === "ANALYSIS") {
    return "IMPLEMENTATION_REVIEW";
  }

  return "SANDBOX_TEST";
}

function resolveSandboxExecutionRole(input: {
  taskType: "IMPLEMENTATION_PLAN" | "ANALYSIS" | "QA_REVIEW";
  providerKey: EdenAiProviderValue | null;
  requestedActionType: ProjectRuntimeAgentActionTypeValue;
}): ProjectRuntimeExecutionRoleValue {
  if (input.requestedActionType === "QA_VALIDATION" || input.taskType === "QA_REVIEW") {
    return "QA_REVIEWER";
  }

  if (input.providerKey) {
    return "TOOL_WORKER";
  }

  if (input.requestedActionType === "IMPLEMENTATION_REVIEW") {
    return "RUNTIME_LEAD";
  }

  return "TOOL_WORKER";
}

function resolveSandboxExecutionAdapterKey(input: {
  providerKey: EdenAiProviderValue | null;
  requestedActionType: ProjectRuntimeAgentActionTypeValue;
}): EdenExecutionAdapterKey {
  if (input.providerKey) {
    return "provider_adapter";
  }

  if (input.requestedActionType === "QA_VALIDATION") {
    return "browser_adapter";
  }

  return "tool_adapter";
}

function resolveSandboxExecutionSessionType(
  adapterKind: EdenExecutionDispatchPreflightRecord["adapterKind"],
): ProjectRuntimeExecutionSessionTypeValue {
  if (adapterKind === "provider") {
    return "PROVIDER_EXECUTION";
  }

  if (adapterKind === "browser") {
    return "BROWSER_EXECUTION";
  }

  return "TOOL_EXECUTION";
}

function buildSandboxExecutionSessionLabel(input: {
  taskTitle: string;
  executionRole: ProjectRuntimeExecutionRoleValue;
  adapterKey: string;
}) {
  return `${formatEnumLabel(input.executionRole)} | ${formatExecutionAdapterLabel(input.adapterKey)} | ${input.taskTitle}`;
}

function buildRuntimeExecutionGovernanceSnapshot(runtime: {
  id: string;
  name: string;
  accessPolicy: "OWNER_ONLY" | "BUSINESS_MEMBERS" | "PUBLIC";
  target: "EDEN_INTERNAL" | "EDEN_MANAGED" | "EXTERNAL_DOMAIN";
  visibility: "PRIVATE_INTERNAL" | "PRIVATE_PREVIEW" | "PUBLIC_LAUNCH";
  runtimeType: "INTERNAL_SANDBOX" | "INTERNAL_PREVIEW" | "EDEN_MANAGED_INSTANCE" | "EXTERNAL_LINKED_DOMAIN";
  configPolicy: {
    executionMode: ProjectRuntimeExecutionModeValue;
    providerPolicyMode: ProjectRuntimeProviderPolicyModeValue;
    allowedProviders: EdenAiProviderValue[];
    ownerOnlyEnforced: boolean;
    internalOnlyEnforced: boolean;
  } | null;
  secretBoundaries: Array<{
    providerKey: EdenAiProviderValue | null;
    status: ProjectRuntimeSecretStatusValue;
    isRequired: boolean;
  }>;
  providerApprovals: Array<{
    providerKey: EdenAiProviderValue;
    approvalStatus: ProjectRuntimeProviderApprovalStatusValue;
    modelScope: string[];
    capabilityScope: string[];
  }>;
}): EdenRuntimeExecutionGovernanceSnapshot {
  return {
    runtimeId: runtime.id,
    runtimeName: runtime.name,
    accessPolicy: runtime.accessPolicy.toLowerCase(),
    target: runtime.target.toLowerCase(),
    visibility: runtime.visibility.toLowerCase(),
    executionMode: runtime.configPolicy?.executionMode.toLowerCase() ?? null,
    providerPolicyMode: runtime.configPolicy?.providerPolicyMode.toLowerCase() ?? null,
    allowedProviders:
      runtime.configPolicy?.allowedProviders.map((provider) =>
        provider.toLowerCase(),
      ) ?? [],
    ownerOnlyEnforced:
      runtime.configPolicy?.ownerOnlyEnforced ?? runtime.accessPolicy === "OWNER_ONLY",
    internalOnlyEnforced:
      runtime.configPolicy?.internalOnlyEnforced ??
      (runtime.target === "EDEN_INTERNAL" ||
        runtime.visibility === "PRIVATE_INTERNAL" ||
        runtime.runtimeType === "INTERNAL_SANDBOX"),
    providerApprovals: runtime.providerApprovals.map((approval) => ({
      providerKey: approval.providerKey.toLowerCase(),
      approvalStatus: approval.approvalStatus.toLowerCase(),
      modelScope: approval.modelScope,
      capabilityScope: approval.capabilityScope,
    })),
    secretBoundaries: runtime.secretBoundaries.map((boundary) => ({
      providerKey: boundary.providerKey?.toLowerCase() ?? null,
      status: boundary.status.toLowerCase(),
      isRequired: boundary.isRequired,
    })),
  };
}

function mapDispatchPreflightToAgentRunStatus(
  dispatchStatus: EdenExecutionDispatchPreflightRecord["dispatchStatus"],
): ProjectRuntimeAgentRunStatusValue {
  switch (dispatchStatus) {
    case "blocked":
      return "PREFLIGHT_BLOCKED";
    case "review_required":
      return "REVIEW_REQUIRED";
    default:
      return "PREPARED";
  }
}

function mapDispatchStatusToExecutionSessionStatus(
  dispatchStatus: EdenExecutionDispatchPreflightRecord["dispatchStatus"],
): ProjectRuntimeExecutionSessionStatusValue {
  switch (dispatchStatus) {
    case "blocked":
      return "BLOCKED";
    case "review_required":
      return "REVIEW_REQUIRED";
    default:
      return "PREPARED";
  }
}

function mapDispatchStatusToSchemaValue(
  dispatchStatus: EdenExecutionDispatchPreflightRecord["dispatchStatus"],
): ProjectRuntimeDispatchStatusValue {
  switch (dispatchStatus) {
    case "blocked":
      return "BLOCKED";
    case "review_required":
      return "REVIEW_REQUIRED";
    default:
      return "READY";
  }
}

function resolveSandboxDispatchMode(
  dispatchPreflight: EdenExecutionDispatchPreflightRecord,
): ProjectRuntimeDispatchModeValue {
  if (dispatchPreflight.reviewRequired) {
    return "OWNER_REVIEW_GATE";
  }

  if (dispatchPreflight.adapterKind === "tool") {
    return "ASYNC_WORKER_HANDOFF";
  }

  return "CONTROL_PLANE_PREFLIGHT";
}

function mapDispatchAdapterKindToSchemaValue(
  adapterKind: EdenExecutionDispatchPreflightRecord["adapterKind"],
): ProjectRuntimeExecutionAdapterKindValue {
  if (adapterKind === "provider") {
    return "PROVIDER";
  }

  if (adapterKind === "browser") {
    return "BROWSER";
  }

  return "TOOL";
}

function mapDispatchAdapterModeToSchemaValue(
  adapterMode: EdenExecutionDispatchPreflightRecord["adapterMode"],
): ProjectRuntimeExecutionAdapterModeValue {
  if (adapterMode === "future_live") {
    return "FUTURE_LIVE";
  }

  if (adapterMode === "preflight_only") {
    return "PREFLIGHT_ONLY";
  }

  return "SCAFFOLD_ONLY";
}

function buildSandboxDispatchResultPayload(input: {
  dispatchPreflight: EdenExecutionDispatchPreflightRecord;
  requestedActionType: ProjectRuntimeAgentActionTypeValue;
}) {
  return {
    resultKind: "dispatch_preflight",
    requestedActionType: input.requestedActionType,
    adapterKey: input.dispatchPreflight.adapterKey,
    adapterKind: input.dispatchPreflight.adapterKind,
    adapterMode: input.dispatchPreflight.adapterMode,
    dispatchStatus: input.dispatchPreflight.dispatchStatus,
    reviewRequired: input.dispatchPreflight.reviewRequired,
    providerKey: input.dispatchPreflight.providerPreflight?.providerKey ?? null,
    providerLabel: input.dispatchPreflight.providerPreflight?.providerLabel ?? null,
    detail: input.dispatchPreflight.detail,
  } satisfies Prisma.JsonObject;
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

function buildProjectRuntimeAuditEntry(input: {
  runtimeId: string;
  actorUserId: string;
  fieldName: ProjectRuntimeAuditFieldName;
  previousValue: string | null;
  nextValue: string | null;
  detail: string;
}) {
  return {
    runtimeId: input.runtimeId,
    actorUserId: input.actorUserId,
    fieldName: input.fieldName,
    previousValue: input.previousValue,
    nextValue: input.nextValue,
    detail: input.detail,
  } satisfies Prisma.ProjectRuntimeAuditLogCreateManyInput;
}

function parseProjectRuntimeLifecycleStatus(
  value: string,
): ProjectRuntimeLifecycleStatus | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "registered":
      return "REGISTERED";
    case "configuring":
      return "CONFIGURING";
    case "ready":
      return "READY";
    case "paused":
      return "PAUSED";
    case "error":
      return "ERROR";
    case "archived":
      return "ARCHIVED";
    default:
      return null;
  }
}

function normalizeRuntimeStatusDetail(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalLeavesBudget(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.round(parsedValue);
}

function normalizeRuntimePolicyText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeRuntimePolicyReference(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeRuntimeHealthCheckAction(
  value: OwnerRuntimeHealthCheckAction | string | null | undefined,
): OwnerRuntimeHealthCheckAction | null {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "keep" ||
    normalized === "set_now" ||
    normalized === "clear"
  ) {
    return normalized;
  }

  return normalized ? null : "keep";
}

function parseProjectRuntimeLaunchIntentType(
  value: OwnerRuntimeLaunchIntentType | string,
): ProjectRuntimeLaunchIntentTypeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "internal_preview":
      return "INTERNAL_PREVIEW";
    case "eden_hosted":
      return "EDEN_HOSTED";
    case "linked_external":
      return "LINKED_EXTERNAL";
    default:
      return null;
  }
}

function parseProjectRuntimeLaunchMode(
  value: OwnerRuntimeLaunchMode | string,
): ProjectRuntimeLaunchModeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "control_plane_only":
      return "CONTROL_PLANE_ONLY";
    case "eden_managed_promotion":
      return "EDEN_MANAGED_PROMOTION";
    case "external_handoff":
      return "EXTERNAL_HANDOFF";
    default:
      return null;
  }
}

function parseProjectRuntimeConfigScope(
  value: OwnerRuntimeConfigScope | string,
): ProjectRuntimeConfigScopeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "owner_internal":
      return "OWNER_INTERNAL";
    case "business_runtime":
      return "BUSINESS_RUNTIME";
    case "public_runtime":
      return "PUBLIC_RUNTIME";
    default:
      return null;
  }
}

function parseProjectRuntimeExecutionMode(
  value: OwnerRuntimeExecutionMode | string,
): ProjectRuntimeExecutionModeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "control_plane_only":
      return "CONTROL_PLANE_ONLY";
    case "sandbox_task_runner_v1":
      return "SANDBOX_TASK_RUNNER_V1";
    case "future_runtime_agent":
      return "FUTURE_RUNTIME_AGENT";
    case "external_runtime_handoff":
      return "EXTERNAL_RUNTIME_HANDOFF";
    default:
      return null;
  }
}

function parseProjectRuntimeProviderPolicyMode(
  value: OwnerRuntimeProviderPolicyMode | string,
): ProjectRuntimeProviderPolicyModeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "eden_approved_only":
      return "EDEN_APPROVED_ONLY";
    case "runtime_allowlist":
      return "RUNTIME_ALLOWLIST";
    case "owner_approval_required":
      return "OWNER_APPROVAL_REQUIRED";
    default:
      return null;
  }
}

function parseProjectRuntimeLaunchTarget(
  value: OwnerRuntimeLaunchTarget | string,
): ProjectRuntimeTargetValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "eden_internal":
      return "EDEN_INTERNAL";
    case "eden_managed":
      return "EDEN_MANAGED";
    case "external_domain":
      return "EXTERNAL_DOMAIN";
    default:
      return null;
  }
}

function parseProjectRuntimeProviderKey(
  value: OwnerRuntimeProvider | string | null | undefined,
): EdenAiProviderValue | null {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "openai":
      return "OPENAI";
    case "anthropic":
      return "ANTHROPIC";
    default:
      return normalized ? null : null;
  }
}

function parseProjectRuntimeProviderKeys(
  values: Array<OwnerRuntimeProvider | string>,
) {
  const parsedValues = values
    .map((value) => parseProjectRuntimeProviderKey(value))
    .filter((value): value is EdenAiProviderValue => Boolean(value));

  return Array.from(new Set(parsedValues));
}

function parseProjectRuntimeExecutionRole(
  value: OwnerRuntimeExecutionRole | string | null | undefined,
): ProjectRuntimeExecutionRoleValue | null {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "owner_supervisor":
      return "OWNER_SUPERVISOR";
    case "runtime_lead":
      return "RUNTIME_LEAD";
    case "tool_worker":
      return "TOOL_WORKER";
    case "browser_worker":
      return "BROWSER_WORKER";
    case "qa_reviewer":
      return "QA_REVIEWER";
    default:
      return normalized ? null : null;
  }
}

function parseProjectRuntimeExecutionAdapterKey(
  value: OwnerRuntimeExecutionAdapter | string | null | undefined,
): EdenExecutionAdapterKey | null {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "tool_adapter" ||
    normalized === "browser_adapter" ||
    normalized === "provider_adapter"
  ) {
    return normalized;
  }

  return normalized ? null : null;
}

function parseProjectRuntimeProviderApprovalStatus(
  value: OwnerRuntimeProviderApprovalStatus | string,
): ProjectRuntimeProviderApprovalStatusValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "review_required":
      return "REVIEW_REQUIRED";
    case "approved":
      return "APPROVED";
    case "denied":
      return "DENIED";
    default:
      return null;
  }
}

function parseProjectRuntimeSecretStatus(
  value: OwnerRuntimeSecretStatus | string,
): ProjectRuntimeSecretStatusValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "configured":
      return "CONFIGURED";
    case "missing":
      return "MISSING";
    case "pending":
      return "PENDING";
    case "reserved":
      return "RESERVED";
    default:
      return null;
  }
}

function parseProjectRuntimeAgentActionType(
  value: OwnerRuntimeTaskRequestedAction | string | null | undefined,
): ProjectRuntimeAgentActionTypeValue | null {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "provider_preflight":
      return "PROVIDER_PREFLIGHT";
    case "sandbox_test":
      return "SANDBOX_TEST";
    case "qa_validation":
      return "QA_VALIDATION";
    case "implementation_review":
      return "IMPLEMENTATION_REVIEW";
    default:
      return normalized ? null : null;
  }
}

function normalizeRuntimeScopeList(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function areScopedListsEqual(currentValues: string[], nextValues: string[]) {
  if (currentValues.length !== nextValues.length) {
    return false;
  }

  return currentValues.every((value, index) => value === nextValues[index]);
}

function parseProjectRuntimeDeploymentEventType(
  value: OwnerRuntimeDeploymentEventType | string,
): ProjectRuntimeDeploymentEventTypeValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "manual_note":
      return "MANUAL_NOTE";
    case "preview_checkpoint":
      return "PREVIEW_CHECKPOINT";
    case "hosted_checkpoint":
      return "HOSTED_CHECKPOINT";
    case "external_link_checkpoint":
      return "EXTERNAL_LINK_CHECKPOINT";
    default:
      return null;
  }
}

function parseProjectRuntimeDeploymentEventStatus(
  value: OwnerRuntimeDeploymentEventStatus | string,
): ProjectRuntimeDeploymentEventStatusValue | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "recorded":
      return "RECORDED";
    case "planned":
      return "PLANNED";
    case "ready":
      return "READY";
    case "blocked":
      return "BLOCKED";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

function areProviderListsEqual(
  currentProviders: EdenAiProviderValue[],
  nextProviders: EdenAiProviderValue[],
) {
  if (currentProviders.length !== nextProviders.length) {
    return false;
  }

  return currentProviders.every((provider, index) => provider === nextProviders[index]);
}

function formatProviderListValue(providers: EdenAiProviderValue[]) {
  if (!providers.length) {
    return "No approved providers";
  }

  return providers.map((provider) => formatEnumLabel(provider)).join(", ");
}

function formatLeavesBudgetPolicy(
  maxTaskBudgetLeaves: number | null,
  monthlyBudgetLeaves: number | null,
) {
  const parts = [
    maxTaskBudgetLeaves !== null
      ? `Task ${maxTaskBudgetLeaves.toLocaleString()}`
      : "Task unbounded",
    monthlyBudgetLeaves !== null
      ? `Monthly ${monthlyBudgetLeaves.toLocaleString()}`
      : "Monthly unbounded",
  ];

  return parts.join(" | ");
}

function formatRuntimeBoundaryFlags(
  ownerOnlyEnforced: boolean,
  internalOnlyEnforced: boolean,
) {
  return [
    ownerOnlyEnforced ? "Owner only enforced" : "Owner only not enforced",
    internalOnlyEnforced ? "Internal only enforced" : "Internal only not enforced",
  ].join(" | ");
}

function normalizeLaunchDestinationLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeLaunchIntentNotes(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeDeploymentSummary(value: string) {
  return value.trim();
}

function normalizeDeploymentDetail(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildLaunchIntentDeploymentSummary(input: {
  runtimeName: string;
  intentType: ProjectRuntimeLaunchIntentTypeValue;
  intendedTarget: ProjectRuntimeTargetValue;
}) {
  return `${input.runtimeName} launch intent set to ${formatEnumLabel(
    input.intentType,
  )} toward ${formatEnumLabel(input.intendedTarget)}.`;
}

function buildLaunchIntentDeploymentDetail(input: {
  launchMode: ProjectRuntimeLaunchModeValue;
  destinationLabel: string | null;
  notes: string | null;
}) {
  const details = [
    `Launch mode: ${formatEnumLabel(input.launchMode)}.`,
    input.destinationLabel
      ? `Intended destination: ${input.destinationLabel}.`
      : null,
    input.notes ? `Notes: ${input.notes}` : null,
  ].filter(Boolean);

  return details.join(" ");
}

function buildRuntimeConfigAuditEntries(input: {
  runtimeId: string;
  actorUserId: string;
  currentPolicy:
    | {
        configScope: ProjectRuntimeConfigScopeValue;
        executionMode: ProjectRuntimeExecutionModeValue;
        providerPolicyMode: ProjectRuntimeProviderPolicyModeValue;
        allowedProviders: EdenAiProviderValue[];
        defaultProvider: EdenAiProviderValue | null;
        maxTaskBudgetLeaves: number | null;
        monthlyBudgetLeaves: number | null;
        modelPolicySummary: string | null;
        secretPolicyReference: string | null;
        notes: string | null;
        ownerOnlyEnforced: boolean;
        internalOnlyEnforced: boolean;
      }
    | null;
  nextPolicy: {
    configScope: ProjectRuntimeConfigScopeValue;
    executionMode: ProjectRuntimeExecutionModeValue;
    providerPolicyMode: ProjectRuntimeProviderPolicyModeValue;
    allowedProviders: EdenAiProviderValue[];
    defaultProvider: EdenAiProviderValue | null;
    maxTaskBudgetLeaves: number | null;
    monthlyBudgetLeaves: number | null;
    modelPolicySummary: string | null;
    secretPolicyReference: string | null;
    notes: string | null;
    ownerOnlyEnforced: boolean;
    internalOnlyEnforced: boolean;
  };
}) {
  const auditEntries: Prisma.ProjectRuntimeAuditLogCreateManyInput[] = [];
  const currentPolicy = input.currentPolicy;
  const nextPolicy = input.nextPolicy;

  if (!currentPolicy || currentPolicy.configScope !== nextPolicy.configScope) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "configScope",
        previousValue: currentPolicy?.configScope ?? null,
        nextValue: nextPolicy.configScope,
        detail:
          "Updated runtime config scope from the owner runtime control surface.",
      }),
    );
  }

  if (
    !currentPolicy ||
    currentPolicy.executionMode !== nextPolicy.executionMode
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "executionMode",
        previousValue: currentPolicy?.executionMode ?? null,
        nextValue: nextPolicy.executionMode,
        detail:
          "Updated runtime execution mode from the owner runtime control surface.",
      }),
    );
  }

  if (
    !currentPolicy ||
    currentPolicy.providerPolicyMode !== nextPolicy.providerPolicyMode
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "providerPolicyMode",
        previousValue: currentPolicy?.providerPolicyMode ?? null,
        nextValue: nextPolicy.providerPolicyMode,
        detail:
          "Updated runtime provider policy mode from the owner runtime control surface.",
      }),
    );
  }

  if (
    !currentPolicy ||
    !areProviderListsEqual(currentPolicy.allowedProviders, nextPolicy.allowedProviders)
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "allowedProviders",
        previousValue: currentPolicy
          ? formatProviderListValue(currentPolicy.allowedProviders)
          : null,
        nextValue: formatProviderListValue(nextPolicy.allowedProviders),
        detail:
          "Updated the runtime provider allowlist from the owner runtime control surface.",
      }),
    );
  }

  if (!currentPolicy || currentPolicy.defaultProvider !== nextPolicy.defaultProvider) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "defaultProvider",
        previousValue: currentPolicy?.defaultProvider
          ? formatEnumLabel(currentPolicy.defaultProvider)
          : null,
        nextValue: nextPolicy.defaultProvider
          ? formatEnumLabel(nextPolicy.defaultProvider)
          : null,
        detail:
          "Updated the runtime default provider from the owner runtime control surface.",
      }),
    );
  }

  const previousBudgetValue = currentPolicy
    ? formatLeavesBudgetPolicy(
        currentPolicy.maxTaskBudgetLeaves,
        currentPolicy.monthlyBudgetLeaves,
      )
    : null;
  const nextBudgetValue = formatLeavesBudgetPolicy(
    nextPolicy.maxTaskBudgetLeaves,
    nextPolicy.monthlyBudgetLeaves,
  );

  if (!currentPolicy || previousBudgetValue !== nextBudgetValue) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "budgetPolicy",
        previousValue: previousBudgetValue,
        nextValue: nextBudgetValue,
        detail:
          "Updated runtime budget guardrails from the owner runtime control surface.",
      }),
    );
  }

  if (
    !currentPolicy ||
    (currentPolicy.secretPolicyReference ?? null) !==
      nextPolicy.secretPolicyReference
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "secretPolicyReference",
        previousValue: currentPolicy?.secretPolicyReference ?? null,
        nextValue: nextPolicy.secretPolicyReference,
        detail:
          "Updated the runtime secret policy reference from the owner runtime control surface.",
      }),
    );
  }

  const previousBoundaryFlags = currentPolicy
    ? formatRuntimeBoundaryFlags(
        currentPolicy.ownerOnlyEnforced,
        currentPolicy.internalOnlyEnforced,
      )
    : null;
  const nextBoundaryFlags = formatRuntimeBoundaryFlags(
    nextPolicy.ownerOnlyEnforced,
    nextPolicy.internalOnlyEnforced,
  );

  if (!currentPolicy || previousBoundaryFlags !== nextBoundaryFlags) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: "configBoundaryFlags",
        previousValue: previousBoundaryFlags,
        nextValue: nextBoundaryFlags,
        detail:
          "Updated owner-only and internal-only config boundary flags from the owner runtime control surface.",
      }),
    );
  }

  return auditEntries;
}

function buildProviderApprovalAuditEntries(input: {
  runtimeId: string;
  actorUserId: string;
  providerKey: EdenAiProviderValue;
  currentApproval:
    | {
        approvalStatus: ProjectRuntimeProviderApprovalStatusValue;
        modelScope: string[];
        capabilityScope: string[];
        notes: string | null;
      }
    | null;
  nextApproval: {
    approvalStatus: ProjectRuntimeProviderApprovalStatusValue;
    modelScope: string[];
    capabilityScope: string[];
    notes: string | null;
  };
}) {
  const auditEntries: Prisma.ProjectRuntimeAuditLogCreateManyInput[] = [];
  const providerLabel = formatEnumLabel(input.providerKey);

  if (
    !input.currentApproval ||
    input.currentApproval.approvalStatus !== input.nextApproval.approvalStatus
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: `providerApproval:${input.providerKey.toLowerCase()}`,
        previousValue: input.currentApproval?.approvalStatus ?? null,
        nextValue: input.nextApproval.approvalStatus,
        detail: `Updated the ${providerLabel} provider approval gate from the owner runtime control surface.`,
      }),
    );
  }

  const previousScopeValue = input.currentApproval
    ? formatRuntimeScopeAuditValue(
        input.currentApproval.modelScope,
        input.currentApproval.capabilityScope,
      )
    : null;
  const nextScopeValue = formatRuntimeScopeAuditValue(
    input.nextApproval.modelScope,
    input.nextApproval.capabilityScope,
  );

  if (!input.currentApproval || previousScopeValue !== nextScopeValue) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: `providerApprovalScope:${input.providerKey.toLowerCase()}`,
        previousValue: previousScopeValue,
        nextValue: nextScopeValue,
        detail: `Updated the ${providerLabel} provider scope constraints from the owner runtime control surface.`,
      }),
    );
  }

  if (
    !input.currentApproval ||
    (input.currentApproval.notes ?? null) !== input.nextApproval.notes
  ) {
    auditEntries.push(
      buildProjectRuntimeAuditEntry({
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        fieldName: `providerApprovalNotes:${input.providerKey.toLowerCase()}`,
        previousValue: input.currentApproval?.notes ?? null,
        nextValue: input.nextApproval.notes,
        detail: `Updated the ${providerLabel} provider approval notes from the owner runtime control surface.`,
      }),
    );
  }

  return auditEntries;
}

function formatRuntimeScopeAuditValue(
  modelScope: string[],
  capabilityScope: string[],
) {
  const modelValue = modelScope.length ? modelScope.join(", ") : "Any model";
  const capabilityValue = capabilityScope.length
    ? capabilityScope.join(", ")
    : "Any capability";

  return `Models: ${modelValue} | Capabilities: ${capabilityValue}`;
}

async function syncProjectRuntimeSecretBoundaries(
  transaction: Prisma.TransactionClient,
  input: {
    runtimeId: string;
    runtimeAccessPolicy: "OWNER_ONLY" | "BUSINESS_MEMBERS" | "PUBLIC";
    runtimeTarget: "EDEN_INTERNAL" | "EDEN_MANAGED" | "EXTERNAL_DOMAIN";
    allowedProviders: EdenAiProviderValue[];
    ownerOnlyEnforced: boolean;
    internalOnlyEnforced: boolean;
  },
) {
  const baseSecretScope = resolveRuntimeSecretScope(input);
  const visibilityPolicy = resolveRuntimeSecretVisibilityPolicy(input);
  const existingBoundaries = await transaction.projectRuntimeSecretBoundary.findMany({
    where: {
      runtimeId: input.runtimeId,
    },
    select: {
      id: true,
      label: true,
      providerKey: true,
      status: true,
      isRequired: true,
    },
  });

  const existingByLabel = new Map(
    existingBoundaries.map((boundary) => [boundary.label, boundary]),
  );

  await upsertRuntimeSecretBoundary(transaction, {
    runtimeId: input.runtimeId,
    label: "Runtime environment bundle",
    description:
      "Metadata-only boundary for future environment variables and runtime-scoped configuration. No raw values are stored in Eden v1.",
    secretType: "ENVIRONMENT_GROUP",
    secretScope: baseSecretScope,
    visibilityPolicy,
    status: existingByLabel.get("Runtime environment bundle")?.status ?? "RESERVED",
    isRequired: false,
    providerKey: null,
    boundaryReference: "RUNTIME_ENV_BUNDLE",
  });

  for (const provider of input.allowedProviders) {
    const label = `${formatEnumLabel(provider)} provider credential`;
    const existingBoundary = existingByLabel.get(label);

    await upsertRuntimeSecretBoundary(transaction, {
      runtimeId: input.runtimeId,
      label,
      description:
        "Metadata-only credential boundary for a future approved AI provider adapter. No raw secret value is stored in Eden v1.",
      secretType: "PROVIDER_API_KEY",
      secretScope: baseSecretScope,
      visibilityPolicy,
      status: existingBoundary?.status ?? "MISSING",
      isRequired: true,
      providerKey: provider,
      boundaryReference: `${provider}_API_KEY`,
    });
  }

  const allowedProviderLabels = new Set(
    input.allowedProviders.map((provider) => `${formatEnumLabel(provider)} provider credential`),
  );

  for (const boundary of existingBoundaries) {
    if (
      boundary.providerKey &&
      !allowedProviderLabels.has(boundary.label) &&
      boundary.isRequired
    ) {
      await transaction.projectRuntimeSecretBoundary.update({
        where: {
          id: boundary.id,
        },
        data: {
          isRequired: false,
          status: boundary.status === "CONFIGURED" ? "CONFIGURED" : "RESERVED",
        },
      });
    }
  }
}

async function syncProjectRuntimeProviderApprovals(
  transaction: Prisma.TransactionClient,
  input: {
    runtimeId: string;
    actorUserId: string;
    allowedProviders: EdenAiProviderValue[];
  },
) {
  for (const provider of input.allowedProviders) {
    await transaction.projectRuntimeProviderApproval.upsert({
      where: {
        runtimeId_providerKey: {
          runtimeId: input.runtimeId,
          providerKey: provider,
        },
      },
      update: {},
      create: {
        runtimeId: input.runtimeId,
        actorUserId: input.actorUserId,
        providerKey: provider,
        approvalStatus: "REVIEW_REQUIRED",
        modelScope: [],
        capabilityScope: [],
      },
    });
  }
}

async function upsertRuntimeSecretBoundary(
  transaction: Prisma.TransactionClient,
  input: {
    runtimeId: string;
    label: string;
    description: string;
    secretType: ProjectRuntimeSecretTypeValue;
    secretScope: ProjectRuntimeSecretScopeValue;
    visibilityPolicy: ProjectRuntimeSecretVisibilityPolicyValue;
    status: ProjectRuntimeSecretStatusValue;
    isRequired: boolean;
    providerKey: EdenAiProviderValue | null;
    boundaryReference: string;
  },
) {
  await transaction.projectRuntimeSecretBoundary.upsert({
    where: {
      runtimeId_label: {
        runtimeId: input.runtimeId,
        label: input.label,
      },
    },
    update: {
      description: input.description,
      secretType: input.secretType,
      secretScope: input.secretScope,
      visibilityPolicy: input.visibilityPolicy,
      isRequired: input.isRequired,
      providerKey: input.providerKey,
      boundaryReference: input.boundaryReference,
    },
    create: {
      runtimeId: input.runtimeId,
      label: input.label,
      description: input.description,
      secretType: input.secretType,
      secretScope: input.secretScope,
      visibilityPolicy: input.visibilityPolicy,
      status: input.status,
      isRequired: input.isRequired,
      providerKey: input.providerKey,
      boundaryReference: input.boundaryReference,
    },
  });
}

function resolveRuntimeSecretScope(input: {
  runtimeAccessPolicy: "OWNER_ONLY" | "BUSINESS_MEMBERS" | "PUBLIC";
  runtimeTarget: "EDEN_INTERNAL" | "EDEN_MANAGED" | "EXTERNAL_DOMAIN";
  ownerOnlyEnforced: boolean;
  internalOnlyEnforced: boolean;
}): ProjectRuntimeSecretScopeValue {
  if (
    input.ownerOnlyEnforced ||
    input.internalOnlyEnforced ||
    input.runtimeAccessPolicy === "OWNER_ONLY" ||
    input.runtimeTarget === "EDEN_INTERNAL"
  ) {
    return "OWNER_INTERNAL";
  }

  if (input.runtimeTarget === "EXTERNAL_DOMAIN") {
    return "RUNTIME_ONLY";
  }

  return "BUSINESS_SHARED";
}

function resolveRuntimeSecretVisibilityPolicy(input: {
  runtimeAccessPolicy: "OWNER_ONLY" | "BUSINESS_MEMBERS" | "PUBLIC";
  runtimeTarget: "EDEN_INTERNAL" | "EDEN_MANAGED" | "EXTERNAL_DOMAIN";
  ownerOnlyEnforced: boolean;
  internalOnlyEnforced: boolean;
}): ProjectRuntimeSecretVisibilityPolicyValue {
  if (
    input.ownerOnlyEnforced ||
    input.internalOnlyEnforced ||
    input.runtimeAccessPolicy === "OWNER_ONLY" ||
    input.runtimeTarget === "EDEN_INTERNAL"
  ) {
    return "OWNER_METADATA_ONLY";
  }

  return "STATUS_ONLY";
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
    message.includes("projectruntimeagentrun") ||
    message.includes("projectruntimeauditlog") ||
    message.includes("projectruntimeconfigpolicy") ||
    message.includes("projectruntimelaunchintent") ||
    message.includes("projectruntimedeploymentrecord") ||
    message.includes("projectruntimedomainlink") ||
    message.includes("projectruntimeproviderapproval") ||
    message.includes("projectruntimesecretboundary") ||
    message.includes("projectruntimeexecutionsession") ||
    message.includes("projectruntimedispatchrecord") ||
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
    message.includes("projectruntimeagentrun") ||
    message.includes("projectruntimeexecutionsession") ||
    message.includes("projectruntimedispatchrecord") ||
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

function formatExecutionAdapterLabel(value: string) {
  if (value === "tool_adapter") {
    return "Tool Adapter";
  }

  if (value === "browser_adapter") {
    return "Browser Adapter";
  }

  if (value === "provider_adapter") {
    return "Provider Adapter";
  }

  return formatEnumLabel(value);
}

function formatProjectRuntimeAuditFieldLabel(fieldName: string) {
  if (fieldName.startsWith("providerApproval:")) {
    return `${formatEnumLabel(fieldName.split(":")[1] ?? "provider")} Approval`;
  }

  if (fieldName.startsWith("providerApprovalScope:")) {
    return `${formatEnumLabel(fieldName.split(":")[1] ?? "provider")} Scope`;
  }

  if (fieldName.startsWith("providerApprovalNotes:")) {
    return `${formatEnumLabel(fieldName.split(":")[1] ?? "provider")} Notes`;
  }

  if (fieldName.startsWith("secretBoundaryStatus:")) {
    return "Secret Boundary Status";
  }

  if (fieldName.startsWith("secretBoundaryDetail:")) {
    return "Secret Boundary Detail";
  }

  if (fieldName.startsWith("secretBoundaryChecked:")) {
    return "Secret Boundary Check";
  }

  if (fieldName === "statusDetail") {
    return "Status Detail";
  }

  if (fieldName === "lastHealthCheckAt") {
    return "Health Check";
  }

  if (fieldName === "configScope") {
    return "Config Scope";
  }

  if (fieldName === "executionMode") {
    return "Execution Mode";
  }

  if (fieldName === "providerPolicyMode") {
    return "Provider Policy";
  }

  if (fieldName === "allowedProviders") {
    return "Allowed Providers";
  }

  if (fieldName === "defaultProvider") {
    return "Default Provider";
  }

  if (fieldName === "budgetPolicy") {
    return "Budget Policy";
  }

  if (fieldName === "secretPolicyReference") {
    return "Secret Policy";
  }

  if (fieldName === "configBoundaryFlags") {
    return "Boundary Flags";
  }

  return formatEnumLabel(fieldName);
}

function formatProjectRuntimeAuditValueLabel(
  fieldName: string,
  value: string | null,
) {
  if (value === null) {
    return "Cleared";
  }

  if (fieldName === "status") {
    return formatEnumLabel(value);
  }

  if (
    fieldName === "configScope" ||
    fieldName === "executionMode" ||
    fieldName === "providerPolicyMode" ||
    fieldName.startsWith("providerApproval:")
  ) {
    return formatEnumLabel(value);
  }

  if (fieldName === "lastHealthCheckAt") {
    const timestamp = new Date(value);

    if (!Number.isNaN(timestamp.getTime())) {
      return formatTimestamp(timestamp);
    }
  }

  return value;
}

function summarizeJsonPayload(payload: Prisma.JsonValue | null | undefined) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.length ? JSON.stringify(payload[0]) : "[]";
  }

  if (typeof payload !== "object") {
    return String(payload);
  }

  const summaryKeys = [
    "summary",
    "detail",
    "executionNote",
    "resultKind",
    "providerLabel",
  ] as const;

  for (const key of summaryKeys) {
    const candidate = payload[key];

    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return JSON.stringify(payload);
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
