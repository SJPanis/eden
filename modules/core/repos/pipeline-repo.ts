import type {
  EdenRepoPipelineEventRecord,
  EdenRepoPipelineRecord,
  EdenRepoPipelineStatus,
} from "@/modules/core/repos/repo-types";

export interface PipelineRepo {
  findRecordByBusinessAndService(
    businessId: string,
    serviceId: string,
  ): Promise<EdenRepoPipelineRecord | null>;
  listRecordsByBusinessId(businessId: string): Promise<EdenRepoPipelineRecord[]>;
  listRecentEventsByBusinessId(businessId: string): Promise<EdenRepoPipelineEventRecord[]>;
  transitionRecord(input: {
    businessId: string;
    serviceId: string;
    nextStatus: EdenRepoPipelineStatus;
    actorLabel: string;
    detail?: string;
  }): Promise<EdenRepoPipelineEventRecord>;
}
