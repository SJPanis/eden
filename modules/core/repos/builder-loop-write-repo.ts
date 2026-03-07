import type {
  EdenPersistentBusinessWrite,
  EdenPersistentPipelineEventWrite,
  EdenPersistentPipelineRecordWrite,
  EdenPersistentServiceDraftWrite,
} from "@/modules/core/services/builder-loop-write-types";

export interface BuilderLoopWriteRepo {
  createBusiness(input: EdenPersistentBusinessWrite): Promise<void>;
  createServiceDraft(input: EdenPersistentServiceDraftWrite): Promise<void>;
  upsertPipelineRecord(input: EdenPersistentPipelineRecordWrite): Promise<void>;
  appendPipelineEvent(input: EdenPersistentPipelineEventWrite): Promise<void>;
}
