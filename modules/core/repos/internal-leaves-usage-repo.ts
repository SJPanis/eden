import type { EdenRepoInternalLeavesUsageRecord } from "@/modules/core/repos/repo-types";

export interface InternalLeavesUsageRepo {
  create(input: {
    businessId: string;
    userId?: string | null;
    amountCredits: number;
    usageType: string;
    reference?: string | null;
    notes?: string | null;
  }): Promise<EdenRepoInternalLeavesUsageRecord>;

  listByBusinessId(input: {
    businessId: string;
    limit?: number;
  }): Promise<EdenRepoInternalLeavesUsageRecord[]>;

  listAll(input?: {
    limit?: number;
  }): Promise<EdenRepoInternalLeavesUsageRecord[]>;
}
