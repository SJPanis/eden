import type {
  EdenRepoServiceUsageRecord,
  EdenRepoServiceUsageSummary,
} from "@/modules/core/repos/repo-types";

export interface ServiceUsageRepo {
  create(input: {
    serviceId: string;
    userId?: string | null;
    usageType: string;
    creditsUsed: number;
    grossCredits?: number | null;
    platformFeeCredits?: number | null;
    builderEarningsCredits?: number | null;
    createdAt?: Date;
  }): Promise<EdenRepoServiceUsageRecord | null>;
  listAll(): Promise<EdenRepoServiceUsageRecord[]>;
  getSummary(): Promise<EdenRepoServiceUsageSummary>;
}
