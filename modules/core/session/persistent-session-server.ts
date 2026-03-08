import "server-only";

import {
  logResolvedSessionSnapshot,
  logSessionResolution,
  shouldExposeAuthSessionDiagnostics,
  type EdenAuthSessionMode,
} from "@/modules/core/session/auth-runtime";
import {
  createCompatibilitySession,
  type EdenMockSession,
  withSessionAuthDebug,
} from "@/modules/core/session/mock-session";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { createPrismaAuthIdentityAdapter } from "@/modules/core/session/prisma-auth-identity-adapter";

export async function resolvePersistentCompatibilitySession(
  sessionKey: string | null | undefined,
  mode: EdenAuthSessionMode,
): Promise<EdenMockSession | null> {
  if (!sessionKey) {
    return null;
  }

  try {
    const adapter = createPrismaAuthIdentityAdapter(getPrismaClient());
    const identity = await adapter.resolveIdentity(sessionKey);

    if (!identity) {
      logSessionResolution(
        mode,
        "persistent",
        "persistent_fallback",
        `No persisted identity was found for ${sessionKey}.`,
      );
      return null;
    }

    const session = createCompatibilitySession(
      {
        id: identity.user.id,
        username: identity.user.username,
        displayName: identity.user.displayName,
        role: identity.platformRole,
        status: identity.user.status,
        edenBalanceCredits: identity.user.edenBalanceCredits,
        businessIds: identity.user.businessIds,
      },
      {
        auth: {
          mode,
          source: "persistent",
          resolver: identity.resolver,
          sessionKey: identity.sessionKey,
        },
        memberships: identity.memberships,
      },
    );
    const diagnosticsEnabled = shouldExposeAuthSessionDiagnostics();
    const resolvedSession = diagnosticsEnabled
      ? withSessionAuthDebug(session, {
          memberships: identity.memberships,
          usedOwnedBusinessFallbackClaims: identity.diagnostics.usedOwnedBusinessFallbackClaims,
          note:
            identity.diagnostics.ownerFallbackMembershipCount > 0
              ? `Used ${identity.diagnostics.ownerFallbackMembershipCount} owned-business fallback claim(s) alongside ${identity.diagnostics.explicitMembershipCount} explicit membership(s).`
              : `Resolved ${identity.diagnostics.explicitMembershipCount} explicit persistent membership(s).`,
        })
      : session;

    logSessionResolution(
      mode,
      "persistent",
      identity.resolver,
      `Resolved persisted identity for ${identity.user.username}.`,
    );
    logResolvedSessionSnapshot({
      mode,
      source: "persistent",
      resolver: identity.resolver,
      role: identity.platformRole,
      memberships: identity.memberships,
      usedOwnedBusinessFallbackClaims: identity.diagnostics.usedOwnedBusinessFallbackClaims,
      detail: `Resolved persisted identity for ${identity.user.username}.`,
    });

    return resolvedSession;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown persistent auth adapter failure";

    logSessionResolution(
      mode,
      "persistent",
      "persistent_fallback",
      `Persistent auth identity adapter failed for ${sessionKey}. ${message}`,
    );
    return null;
  }
}
