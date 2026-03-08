import "server-only";

import type { BusinessMemberRole, EdenRole, UserStatus } from "@prisma/client";
import type { EdenPrismaClient } from "@/modules/core/repos/prisma-client";
import type {
  EdenAuthIdentity,
  EdenAuthIdentityAdapter,
} from "@/modules/core/session/auth-identity-adapter";

const prismaAuthIdentitySelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  status: true,
  edenBalanceCredits: true,
  businessMemberships: {
    select: {
      businessId: true,
      role: true,
    },
  },
  ownedBusinesses: {
    select: {
      id: true,
    },
  },
} as const;

export function createPrismaAuthIdentityAdapter(
  prisma: EdenPrismaClient,
): EdenAuthIdentityAdapter {
  return {
    async resolveIdentity(sessionKey) {
      const user = await prisma.user.findUnique({
        where: {
          id: sessionKey,
        },
        select: prismaAuthIdentitySelect,
      });

      if (!user) {
        return null;
      }

      const explicitMemberships = user.businessMemberships.map((membership) => ({
        businessId: membership.businessId,
        businessRole: formatBusinessMembershipRole(membership.role),
        source: "persistent" as const,
      }));
      const explicitMembershipBusinessIds = new Set(
        explicitMemberships.map((membership) => membership.businessId),
      );
      const ownerMemberships = user.ownedBusinesses
        .filter((business) => !explicitMembershipBusinessIds.has(business.id))
        .map((business) => ({
          businessId: business.id,
          businessRole: "owner" as const,
          source: "persistent" as const,
        }));
      const memberships = [...explicitMemberships, ...ownerMemberships];

      return {
        sessionKey,
        resolver: "prisma_identity_adapter",
        platformRole: formatPlatformRole(user.role),
        diagnostics: {
          usedOwnedBusinessFallbackClaims: ownerMemberships.length > 0,
          explicitMembershipCount: explicitMemberships.length,
          ownerFallbackMembershipCount: ownerMemberships.length,
        },
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          status: formatUserStatus(user.status),
          edenBalanceCredits: user.edenBalanceCredits,
          businessIds: memberships.map((membership) => membership.businessId),
        },
        memberships,
      } satisfies EdenAuthIdentity;
    },
  };
}

function formatPlatformRole(role: EdenRole) {
  if (role === "OWNER") {
    return "owner" as const;
  }

  if (role === "BUSINESS") {
    return "business" as const;
  }

  return "consumer" as const;
}

function formatUserStatus(status: UserStatus) {
  if (status === "REVIEW") {
    return "review";
  }

  if (status === "FROZEN") {
    return "frozen";
  }

  return "active";
}

function formatBusinessMembershipRole(role: BusinessMemberRole) {
  if (role === "OWNER") {
    return "owner" as const;
  }

  if (role === "ADMIN") {
    return "admin" as const;
  }

  if (role === "EDITOR") {
    return "editor" as const;
  }

  return "member" as const;
}
