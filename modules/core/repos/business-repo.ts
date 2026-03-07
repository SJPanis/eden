import type { EdenRepoBusinessRecord } from "@/modules/core/repos/repo-types";

export interface BusinessRepo {
  findById(businessId: string): Promise<EdenRepoBusinessRecord | null>;
  findByOwnerUserId(ownerUserId: string): Promise<EdenRepoBusinessRecord[]>;
  list(): Promise<EdenRepoBusinessRecord[]>;
}
