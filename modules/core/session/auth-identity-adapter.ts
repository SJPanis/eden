import type { EdenRole } from "@/modules/core/config/role-nav";
import type {
  EdenSessionBusinessMembership,
  EdenSessionResolver,
} from "@/modules/core/session/auth-runtime";

export type EdenAuthIdentity = {
  sessionKey: string;
  resolver: EdenSessionResolver;
  platformRole: EdenRole;
  user: {
    id: string;
    username: string;
    displayName: string;
    status: string;
    edenBalanceCredits: number;
    businessIds: string[];
  };
  memberships: EdenSessionBusinessMembership[];
};

export interface EdenAuthIdentityAdapter {
  resolveIdentity(sessionKey: string): Promise<EdenAuthIdentity | null>;
}

