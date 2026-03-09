import type { EdenRepoPayoutSettlementRecord } from "@/modules/core/repos/repo-types";

export interface PayoutSettlementRepo {
  create(input: {
    businessId: string;
    amountCredits: number;
    status?: "pending" | "settled" | "canceled";
    reference?: string | null;
    notes?: string | null;
    settledAt?: Date | null;
  }): Promise<EdenRepoPayoutSettlementRecord>;

  listByBusinessId(input: {
    businessId: string;
    limit?: number;
  }): Promise<EdenRepoPayoutSettlementRecord[]>;

  listAll(input?: {
    limit?: number;
  }): Promise<EdenRepoPayoutSettlementRecord[]>;
}
