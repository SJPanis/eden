import type { EdenRepoUserRecord } from "@/modules/core/repos/repo-types";

export interface UserRepo {
  findById(userId: string): Promise<EdenRepoUserRecord | null>;
  findByUsername(username: string): Promise<EdenRepoUserRecord | null>;
  list(): Promise<EdenRepoUserRecord[]>;
}
