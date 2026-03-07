import type { PipelineRepo } from "@/modules/core/repos/pipeline-repo";
import type { EdenRepoPipelineStatus } from "@/modules/core/repos/repo-types";

export interface PipelineService {
  getRecord(businessId: string, serviceId: string): ReturnType<PipelineRepo["findRecordByBusinessAndService"]>;
  getBusinessRecords(businessId: string): ReturnType<PipelineRepo["listRecordsByBusinessId"]>;
  getRecentEvents(businessId: string): ReturnType<PipelineRepo["listRecentEventsByBusinessId"]>;
  transition(input: {
    businessId: string;
    serviceId: string;
    nextStatus: EdenRepoPipelineStatus;
    actorLabel: string;
    detail?: string;
  }): ReturnType<PipelineRepo["transitionRecord"]>;
}

export function createPipelineService(pipelineRepo: PipelineRepo): PipelineService {
  return {
    getRecord(businessId, serviceId) {
      return pipelineRepo.findRecordByBusinessAndService(businessId, serviceId);
    },
    getBusinessRecords(businessId) {
      return pipelineRepo.listRecordsByBusinessId(businessId);
    },
    getRecentEvents(businessId) {
      return pipelineRepo.listRecentEventsByBusinessId(businessId);
    },
    transition(input) {
      return pipelineRepo.transitionRecord(input);
    },
  };
}
