import type { EdenDiscoverySnapshotRecord } from "@/modules/core/repos/repo-types";

export interface DiscoveryRepo {
  getDiscoverySnapshot(): Promise<EdenDiscoverySnapshotRecord>;
}
