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
import { createPrismaCookieAuthProviderAdapter } from "@/modules/core/session/prisma-cookie-auth-provider-adapter";
import { createPrismaAuthIdentityAdapter } from "@/modules/core/session/prisma-auth-identity-adapter";

export async function resolvePersistentCompatibilitySession(
  providerCookieValue: string | null | undefined,
  mode: EdenAuthSessionMode,
): Promise<EdenMockSession | null> {
  if (!providerCookieValue) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const providerAdapter = createPrismaCookieAuthProviderAdapter(prisma);
    const providerSession = await providerAdapter.resolveProviderSession(providerCookieValue);

    if (!providerSession) {
      logSessionResolution(
        mode,
        "persistent",
        "persistent_fallback",
        "No provider-backed auth session was found for the current request.",
      );
      return null;
    }

    const identityAdapter = createPrismaAuthIdentityAdapter(prisma);
    const identity = await identityAdapter.resolveIdentity(providerSession.sessionKey);

    if (!identity) {
      logSessionResolution(
        mode,
        "persistent",
        "persistent_fallback",
        `Provider ${providerSession.provider} resolved a session key, but no persisted identity was found for ${providerSession.sessionKey}.`,
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
              ? `${providerSession.diagnostics.note} Used ${identity.diagnostics.ownerFallbackMembershipCount} owned-business fallback claim(s) alongside ${identity.diagnostics.explicitMembershipCount} explicit membership(s).`
              : `${providerSession.diagnostics.note} Resolved ${identity.diagnostics.explicitMembershipCount} explicit persistent membership(s).`,
        })
      : session;

    logSessionResolution(
      mode,
      "persistent",
      identity.resolver,
      `Resolved persisted identity for ${identity.user.username} via provider ${providerSession.provider}.`,
    );
    logResolvedSessionSnapshot({
      mode,
      source: "persistent",
      resolver: identity.resolver,
      role: identity.platformRole,
      memberships: identity.memberships,
      usedOwnedBusinessFallbackClaims: identity.diagnostics.usedOwnedBusinessFallbackClaims,
      detail: `${providerSession.diagnostics.note} Resolved persisted identity for ${identity.user.username}.`,
    });

    return resolvedSession;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown persistent auth adapter failure";

    logSessionResolution(
      mode,
      "persistent",
      "persistent_fallback",
      `Persistent auth adapter chain failed. ${message}`,
    );
    return null;
  }
}
