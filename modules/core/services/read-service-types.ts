import type { EdenMockCreatedBusinessState } from "@/modules/core/business/mock-created-business";
import type { EdenMockWorkspaceServiceState } from "@/modules/core/business/mock-workspace-services";
import type { EdenMockPipelineRecord } from "@/modules/core/mock-data/platform-types";

export type EdenBuilderLoopReadMode = "mock_only" | "hybrid" | "real_only";

export type EdenReadServiceOptions = {
  pipelineRecords?: EdenMockPipelineRecord[];
  createdBusiness?: EdenMockCreatedBusinessState | null;
  workspaceServices?: EdenMockWorkspaceServiceState[];
};
