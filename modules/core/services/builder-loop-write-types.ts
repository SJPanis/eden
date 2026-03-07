import type {
  EdenMockCreatedBusinessInput,
  EdenMockCreatedBusinessRecord,
  EdenMockCreatedBusinessState,
  EdenMockBusinessCreationSource,
} from "@/modules/core/business/mock-created-business";
import type {
  EdenMockWorkspaceServiceInput,
  EdenMockWorkspaceServiceRecord,
  EdenMockWorkspaceServiceState,
} from "@/modules/core/business/mock-workspace-services";
import type {
  EdenMockPipelineAction,
} from "@/modules/core/pipeline/mock-pipeline";
import type {
  EdenMockPipelineEvent,
  EdenMockPipelineRecord,
  EdenMockTransaction,
} from "@/modules/core/mock-data/platform-types";

export type EdenBuilderLoopWriteMode = "mock_only" | "dual_write" | "real_only";

export type EdenCreateBusinessCommand = {
  input: EdenMockCreatedBusinessInput;
  ownerUserId: string;
  targetUserId: string;
};

export type EdenCreateBusinessResult = {
  record: EdenMockCreatedBusinessRecord;
  targetUserId: string;
};

export type EdenCreateServiceDraftCommand = {
  input: EdenMockWorkspaceServiceInput;
  businessId: string;
  ownerUserId: string;
  currentWorkspaceServices?: EdenMockWorkspaceServiceRecord[];
  currentPipelineRecords?: EdenMockPipelineRecord[];
};

export type EdenCreateServiceDraftResult = {
  workspaceServiceRecord: EdenMockWorkspaceServiceRecord;
  nextWorkspaceServices: EdenMockWorkspaceServiceRecord[];
  pipelineRecord: EdenMockPipelineRecord;
  nextPipelineRecords: EdenMockPipelineRecord[];
};

export type EdenUpsertPipelineRecordCommand = {
  record: EdenMockPipelineRecord;
  currentRecords?: EdenMockPipelineRecord[];
};

export type EdenUpsertPipelineRecordResult = {
  record: EdenMockPipelineRecord;
  nextRecords: EdenMockPipelineRecord[];
};

export type EdenAppendPipelineEventCommand = {
  event: EdenMockPipelineEvent;
  currentEvents?: EdenMockPipelineEvent[];
};

export type EdenAppendPipelineEventResult = {
  event: EdenMockPipelineEvent;
  nextEvents: EdenMockPipelineEvent[];
};

export type EdenApplyPipelineTransitionCommand = {
  action: EdenMockPipelineAction;
  businessId: string;
  userId: string;
  actor?: string;
  simulatedTransactions?: EdenMockTransaction[];
  currentRecords?: EdenMockPipelineRecord[];
  currentEvents?: EdenMockPipelineEvent[];
  createdBusiness?: EdenMockCreatedBusinessState | null;
  workspaceServices?: EdenMockWorkspaceServiceState[];
};

export type EdenPersistentBusinessWrite = {
  businessId: string;
  ownerUserId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  targetAudience: string;
  monetizationModel?: string;
  source: EdenMockBusinessCreationSource;
  sourceIdeaTitle?: string;
  sourceIdeaDescription?: string;
  createdAt: string;
  featuredServiceId?: string;
};

export type EdenPersistentServiceDraftWrite = {
  serviceId: string;
  projectId: string;
  businessId: string;
  ownerUserId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  pricingModel?: string;
  automationDescription?: string;
  createdAt: string;
  updatedAt: string;
};

export type EdenPersistentPipelineRecordWrite = {
  businessId: string;
  serviceId: string;
  projectId?: string;
  status: EdenMockPipelineRecord["status"];
  buildStarted: boolean;
  updatedAt: string;
  lastActionLabel: string;
};

export type EdenPersistentPipelineEventWrite = {
  eventId: string;
  businessId: string;
  serviceId: string;
  projectId?: string;
  previousStatus: EdenMockPipelineEvent["previousStatus"];
  newStatus: EdenMockPipelineEvent["newStatus"];
  actor: string;
  detail: string;
  timestamp: string;
};
