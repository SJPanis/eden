import "server-only";

import {
  logSessionResolution,
  type EdenAuthSessionMode,
} from "@/modules/core/session/auth-runtime";
import {
  createCompatibilitySession,
  type EdenMockSession,
} from "@/modules/core/session/mock-session";
import { loadBusinessesForOwner } from "@/modules/core/services/business-service";
import { loadUserById } from "@/modules/core/services/user-service";

export async function resolvePersistentCompatibilitySession(
  userId: string | null | undefined,
  mode: EdenAuthSessionMode,
): Promise<EdenMockSession | null> {
  if (!userId) {
    return null;
  }

  const user = await loadUserById(userId);

  if (!user) {
    logSessionResolution(
      mode,
      "persistent",
      "persistent_fallback",
      `No persisted user was found for ${userId}.`,
    );
    return null;
  }

  // TODO: Replace ownership-derived memberships with BusinessMember-backed session claims
  // once the real auth and membership repository layers are introduced.
  const ownedBusinesses = await loadBusinessesForOwner(user.id);
  const businessIds = Array.from(
    new Set([
      ...user.businessIds,
      ...ownedBusinesses.map((business) => business.id),
    ]),
  );
  const session = createCompatibilitySession(
    {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      edenBalanceCredits: user.edenBalanceCredits,
      businessIds,
    },
    {
      auth: {
        mode,
        source: "persistent",
        resolver: "persistent_cookie",
        sessionKey: userId,
      },
      memberships: ownedBusinesses.map((business) => ({
        businessId: business.id,
        businessRole: "owner" as const,
        source: "persistent" as const,
      })),
    },
  );

  logSessionResolution(
    mode,
    "persistent",
    "persistent_cookie",
    `Resolved persisted compatibility session for ${user.username}.`,
  );

  return session;
}

