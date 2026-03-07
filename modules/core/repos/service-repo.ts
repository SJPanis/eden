import type { EdenRepoServiceRecord } from "@/modules/core/repos/repo-types";

export interface ServiceRepo {
  findById(serviceId: string): Promise<EdenRepoServiceRecord | null>;
  findByBusinessId(businessId: string): Promise<EdenRepoServiceRecord[]>;
  listPublished(): Promise<EdenRepoServiceRecord[]>;
}
