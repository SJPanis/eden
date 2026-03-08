import {
  buildMockCreatedBusinessRecord,
  type EdenMockCreatedBusinessRecord,
} from "@/modules/core/business/mock-created-business";
import {
  buildMockWorkspaceServiceRecord,
  upsertMockWorkspaceServiceRecord,
  type EdenMockWorkspaceServiceRecord,
} from "@/modules/core/business/mock-workspace-services";
import type { BuilderLoopWriteRepo } from "@/modules/core/repos/builder-loop-write-repo";
import { createPrismaBuilderLoopWriteRepo } from "@/modules/core/repos/prisma-builder-loop-write-repo";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  applyPipelineAction,
} from "@/modules/core/pipeline/mock-pipeline";
import type { EdenMockPipelineEvent, EdenMockPipelineRecord } from "@/modules/core/mock-data/platform-types";
import type {
  EdenAppendPipelineEventCommand,
  EdenAppendPipelineEventResult,
  EdenApplyPipelineTransitionCommand,
  EdenBuilderLoopWriteMode,
  EdenCreateBusinessCommand,
  EdenCreateBusinessResult,
  EdenCreateServiceDraftCommand,
  EdenCreateServiceDraftResult,
  EdenPersistentBusinessWrite,
  EdenPersistentPipelineEventWrite,
  EdenPersistentPipelineRecordWrite,
  EdenPersistentServiceDraftWrite,
  EdenUpsertPipelineRecordCommand,
  EdenUpsertPipelineRecordResult,
} from "@/modules/core/services/builder-loop-write-types";

export interface BuilderLoopWriteService {
  createBusiness(command: EdenCreateBusinessCommand): Promise<EdenCreateBusinessResult>;
  createServiceDraft(command: EdenCreateServiceDraftCommand): Promise<EdenCreateServiceDraftResult>;
  upsertPipelineRecord(
    command: EdenUpsertPipelineRecordCommand,
  ): Promise<EdenUpsertPipelineRecordResult>;
  appendPipelineEvent(
    command: EdenAppendPipelineEventCommand,
  ): Promise<EdenAppendPipelineEventResult>;
  applyPipelineTransition(
    command: EdenApplyPipelineTransitionCommand,
  ): Promise<ReturnType<typeof applyPipelineAction>>;
}

type BuilderLoopWriteServiceOptions = {
  persistentRepo?: BuilderLoopWriteRepo | null;
  writeMode?: EdenBuilderLoopWriteMode;
};

const allowedBuilderLoopWriteModes = new Set<EdenBuilderLoopWriteMode>([
  "mock_only",
  "dual_write",
  "real_only",
]);

export function createBuilderLoopWriteService(
  options: BuilderLoopWriteServiceOptions = {},
): BuilderLoopWriteService {
  const requestedMode = options.writeMode ?? resolveBuilderLoopWriteMode();
  const persistentRepo =
    options.persistentRepo === undefined
      ? resolveBuilderLoopWriteRepo(requestedMode)
      : options.persistentRepo;
  const writeMode = getEffectiveBuilderLoopWriteMode(requestedMode, persistentRepo);

  return {
    async createBusiness(command) {
      const record = buildMockCreatedBusinessRecord(command.input, command.ownerUserId);

      await persistBusiness(record, persistentRepo, writeMode);

      return {
        record,
        targetUserId: command.targetUserId,
      };
    },

    async createServiceDraft(command) {
      const workspaceServiceRecord = buildMockWorkspaceServiceRecord(command.input, {
        businessId: command.businessId,
        ownerUserId: command.ownerUserId,
      });
      const nextWorkspaceServices = upsertMockWorkspaceServiceRecord(
        workspaceServiceRecord,
        command.currentWorkspaceServices ?? [],
      );
      const pipelineRecord = buildDraftPipelineRecord(command.businessId, workspaceServiceRecord);

      await persistServiceDraft(workspaceServiceRecord, persistentRepo, writeMode);

      const pipelineState = await this.upsertPipelineRecord({
        record: pipelineRecord,
        currentRecords: command.currentPipelineRecords,
      });

      return {
        workspaceServiceRecord,
        nextWorkspaceServices,
        pipelineRecord,
        nextPipelineRecords: pipelineState.nextRecords,
      };
    },

    async upsertPipelineRecord(command) {
      const nextRecords = upsertPipelineRecord(command.record, command.currentRecords);

      await persistPipelineRecord(command.record, persistentRepo, writeMode);

      return {
        record: command.record,
        nextRecords,
      };
    },

    async appendPipelineEvent(command) {
      const nextEvents = appendPipelineEvent(command.event, command.currentEvents);

      await persistPipelineEvent(command.event, persistentRepo, writeMode);

      return {
        event: command.event,
        nextEvents,
      };
    },

    async applyPipelineTransition(command) {
      const transition = applyPipelineAction({
        action: command.action,
        businessId: command.businessId,
        userId: command.userId,
        actor: command.actor,
        simulatedTransactions: command.simulatedTransactions,
        records: command.currentRecords,
        events: command.currentEvents,
        createdBusiness: command.createdBusiness,
        workspaceServices: command.workspaceServices,
      });

      if (!transition || !transition.applied) {
        return transition;
      }

      const updatedRecord =
        transition.records.find(
          (record) =>
            record.businessId === command.businessId &&
            record.serviceId === transition.snapshot.serviceId,
        ) ?? null;

      await persistPipelineRecord(
        updatedRecord,
        persistentRepo,
        writeMode,
      );

      if (transition.event) {
        await persistPipelineEvent(transition.event, persistentRepo, writeMode);
      }

      return transition;
    },
  };
}

export function resolveBuilderLoopWriteMode(
  input = process.env.EDEN_BUILDER_LOOP_WRITE_MODE,
): EdenBuilderLoopWriteMode {
  if (input && allowedBuilderLoopWriteModes.has(input as EdenBuilderLoopWriteMode)) {
    return input as EdenBuilderLoopWriteMode;
  }

  return "mock_only";
}

function getEffectiveBuilderLoopWriteMode(
  requestedMode: EdenBuilderLoopWriteMode,
  persistentRepo: BuilderLoopWriteRepo | null,
) {
  if (!persistentRepo) {
    return "mock_only";
  }

  return requestedMode;
}

function shouldPersistBuilderLoopWrite(writeMode: EdenBuilderLoopWriteMode) {
  return writeMode === "dual_write" || writeMode === "real_only";
}

function resolveBuilderLoopWriteRepo(
  writeMode: EdenBuilderLoopWriteMode,
): BuilderLoopWriteRepo | null {
  if (!shouldPersistBuilderLoopWrite(writeMode)) {
    return null;
  }

  try {
    return createPrismaBuilderLoopWriteRepo(getPrismaClient());
  } catch (error) {
    logBuilderLoopWriteFailure(
      "initialize_persistent_repo",
      error,
      writeMode,
    );
    return null;
  }
}

function buildDraftPipelineRecord(
  businessId: string,
  workspaceServiceRecord: EdenMockWorkspaceServiceRecord,
): EdenMockPipelineRecord {
  return {
    businessId,
    serviceId: workspaceServiceRecord.serviceId,
    projectId: workspaceServiceRecord.projectId,
    status: "draft",
    buildStarted: false,
    updatedAt: new Date().toISOString(),
    lastActionLabel: "A new local service draft was staged in the Service Builder.",
  };
}

function upsertPipelineRecord(
  record: EdenMockPipelineRecord,
  records: EdenMockPipelineRecord[] = [],
) {
  return [record, ...records.filter((entry) => entry.businessId !== record.businessId)];
}

function appendPipelineEvent(
  event: EdenMockPipelineEvent,
  events: EdenMockPipelineEvent[] = [],
) {
  return sortPipelineEvents([event, ...events]);
}

async function persistBusiness(
  record: EdenMockCreatedBusinessRecord,
  persistentRepo: BuilderLoopWriteRepo | null,
  writeMode: EdenBuilderLoopWriteMode,
) {
  if (!persistentRepo || !shouldPersistBuilderLoopWrite(writeMode)) {
    return;
  }

  // Business creation persists without a featured service link. The active service draft
  // is attached later once the workspace actually creates a durable service record.
  const payload: EdenPersistentBusinessWrite = {
    businessId: record.businessId,
    ownerUserId: record.ownerUserId,
    name: record.name,
    description: record.description,
    category: record.category,
    tags: record.tags,
    targetAudience: record.targetAudience,
    monetizationModel: record.monetizationModel,
    source: record.source,
    sourceIdeaTitle: record.sourceIdeaTitle,
    sourceIdeaDescription: record.sourceIdeaDescription,
    createdAt: record.createdAt,
  };

  await executePersistentWrite("create_business", writeMode, () =>
    persistentRepo.createBusiness(payload),
  );
}

async function persistServiceDraft(
  record: EdenMockWorkspaceServiceRecord,
  persistentRepo: BuilderLoopWriteRepo | null,
  writeMode: EdenBuilderLoopWriteMode,
) {
  if (!persistentRepo || !shouldPersistBuilderLoopWrite(writeMode)) {
    return;
  }

  // TODO: Replace this bridge with a Prisma-backed repository once service drafts become durable records.
  const payload: EdenPersistentServiceDraftWrite = {
    serviceId: record.serviceId,
    projectId: record.projectId,
    businessId: record.businessId,
    ownerUserId: record.ownerUserId,
    name: record.name,
    description: record.description,
    category: record.category,
    tags: record.tags,
    pricingModel: record.pricingModel,
    pricePerUse: record.pricePerUse,
    pricingType: record.pricingType,
    pricingUnit: record.pricingUnit,
    automationDescription: record.automationDescription,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  await executePersistentWrite("create_service_draft", writeMode, () =>
    persistentRepo.createServiceDraft(payload),
  );
}

async function persistPipelineRecord(
  record: EdenMockPipelineRecord | null,
  persistentRepo: BuilderLoopWriteRepo | null,
  writeMode: EdenBuilderLoopWriteMode,
) {
  if (!record || !persistentRepo || !shouldPersistBuilderLoopWrite(writeMode)) {
    return;
  }

  const payload: EdenPersistentPipelineRecordWrite = {
    businessId: record.businessId,
    serviceId: record.serviceId,
    projectId: record.projectId,
    status: record.status,
    buildStarted: record.buildStarted,
    updatedAt: record.updatedAt,
    lastActionLabel: record.lastActionLabel,
  };

  await executePersistentWrite("upsert_pipeline_record", writeMode, () =>
    persistentRepo.upsertPipelineRecord(payload),
  );
}

async function persistPipelineEvent(
  event: EdenMockPipelineEvent,
  persistentRepo: BuilderLoopWriteRepo | null,
  writeMode: EdenBuilderLoopWriteMode,
) {
  if (!persistentRepo || !shouldPersistBuilderLoopWrite(writeMode)) {
    return;
  }

  const payload: EdenPersistentPipelineEventWrite = {
    eventId: event.id,
    businessId: event.businessId,
    serviceId: event.serviceId,
    projectId: event.projectId,
    previousStatus: event.previousStatus,
    newStatus: event.newStatus,
    actor: event.actor,
    detail: event.detail,
    timestamp: event.timestamp,
  };

  await executePersistentWrite("append_pipeline_event", writeMode, () =>
    persistentRepo.appendPipelineEvent(payload),
  );
}

function sortPipelineEvents(events: EdenMockPipelineEvent[]) {
  return [...events].sort((left, right) => {
    const rightTime = new Date(right.timestamp).getTime();
    const leftTime = new Date(left.timestamp).getTime();

    return rightTime - leftTime;
  });
}

async function executePersistentWrite(
  operation: BuilderLoopPersistentOperation,
  writeMode: EdenBuilderLoopWriteMode,
  callback: () => Promise<void>,
) {
  try {
    await callback();
    logBuilderLoopWriteSuccess(operation, writeMode);
  } catch (error) {
    logBuilderLoopWriteFailure(operation, error, writeMode);

    if (writeMode === "real_only") {
      throw error;
    }
  }
}

type BuilderLoopPersistentOperation =
  | "initialize_persistent_repo"
  | "create_business"
  | "create_service_draft"
  | "upsert_pipeline_record"
  | "append_pipeline_event";

function logBuilderLoopWriteSuccess(
  operation: BuilderLoopPersistentOperation,
  writeMode: EdenBuilderLoopWriteMode,
) {
  if (process.env.EDEN_LOG_DUAL_WRITE !== "true") {
    return;
  }

  console.info(
    `[eden-builder-loop] ${writeMode} persistent write completed: ${operation}`,
  );
}

function logBuilderLoopWriteFailure(
  operation: BuilderLoopPersistentOperation,
  error: unknown,
  writeMode: EdenBuilderLoopWriteMode,
) {
  const message = error instanceof Error ? error.message : "Unknown persistent write error";
  const fallbackMessage =
    writeMode === "real_only"
      ? "Persistent-only mode is not active yet because the write boundary still returns mock state to the UI."
      : "Mock state remains authoritative.";

  console.warn(
    `[eden-builder-loop] ${writeMode} persistent write failed during ${operation}. ${fallbackMessage} ${message}`,
  );
}
