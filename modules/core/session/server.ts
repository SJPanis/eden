import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EdenRole } from "@/modules/core/config/role-nav";
import {
  logResolvedSessionSnapshot,
  logSessionResolution,
  persistentSessionCookieName,
  resolveAuthSessionMode,
  shouldExposeAuthSessionDiagnostics,
} from "@/modules/core/session/auth-runtime";
import {
  buildForbiddenHref,
  canAccessRoles,
  mockSessionCookieName,
  resolveMockSession,
  withSessionAuthDebug,
} from "@/modules/core/session/mock-session";
import {
  buildAuthSignInPath,
  getCanonicalRouteForRole,
  shouldEnforceProtectedRouteAuth,
} from "@/modules/core/session/access-control";
import {
  mockOnboardingCookieName,
  parseMockOnboardingCookie,
} from "@/modules/core/session/mock-onboarding";
import { serializeAuthProviderSessionCookie } from "@/modules/core/session/auth-provider-adapter";
import { resolvePersistentCompatibilitySession } from "@/modules/core/session/persistent-session-server";

const mockSessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function getMockSession() {
  return getServerSession();
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const authMode = resolveAuthSessionMode();
  const persistentSession = await resolvePersistentCompatibilitySession(
    cookieStore.get(persistentSessionCookieName)?.value,
    buildCookieHeader(cookieStore),
    authMode,
  );

  if (persistentSession) {
    return persistentSession;
  }

  const fallbackUserId = cookieStore.get(mockSessionCookieName)?.value ?? null;
  const session = resolveMockSession(fallbackUserId, {
    auth: {
      mode: authMode,
      source: "mock",
      resolver: fallbackUserId ? "mock_cookie" : "default_fallback",
      sessionKey: fallbackUserId,
    },
  });
  const diagnosticsEnabled = shouldExposeAuthSessionDiagnostics();
  const fallbackSession = diagnosticsEnabled
    ? withSessionAuthDebug(session, {
        usedOwnedBusinessFallbackClaims: false,
        note:
          authMode === "mock_only"
            ? "Auth runtime is in mock_only mode."
            : "Persistent identity was unavailable, so the session fell back to the mock cookie path.",
      })
    : session;

  if (authMode !== "mock_only") {
    logSessionResolution(
      authMode,
      "mock",
      fallbackUserId ? "mock_cookie" : "default_fallback",
      "Persistent auth is not yet authoritative, so the server session fell back to the mock cookie path.",
    );
  }
  logResolvedSessionSnapshot({
    mode: authMode,
    source: fallbackSession.auth.source,
    resolver: fallbackSession.auth.resolver,
    role: fallbackSession.role,
    memberships: fallbackSession.access.memberships,
    usedOwnedBusinessFallbackClaims: false,
    detail:
      authMode === "mock_only"
        ? "Resolved through the mock session path."
        : "Resolved through mock fallback because no persistent identity was available.",
  });

  return fallbackSession;
}

export async function getMockOnboardingProfile() {
  const cookieStore = await cookies();
  return parseMockOnboardingCookie(cookieStore.get(mockOnboardingCookieName)?.value);
}

export async function persistMockSession(userId: string) {
  const session = resolveMockSession(userId, {
    auth: {
      mode: resolveAuthSessionMode(),
      source: "mock",
      resolver: "mock_cookie",
      sessionKey: userId,
    },
  });
  const cookieStore = await cookies();

  cookieStore.set(mockSessionCookieName, session.user.id, mockSessionCookieOptions);
  cookieStore.set(
    persistentSessionCookieName,
    serializeAuthProviderSessionCookie({
      provider: "eden-dev-session-switcher",
      subject: `eden-dev:${session.user.username}`,
      username: session.user.username,
    }),
    mockSessionCookieOptions,
  );

  return session;
}

export async function requireMockAccess(allowedRoles: EdenRole[], targetPath: string) {
  return requireAccess(allowedRoles, targetPath);
}

export async function requireAccess(allowedRoles: EdenRole[], targetPath: string) {
  const session = await getServerSession();
  const enforceProtectedAuth = shouldEnforceProtectedRouteAuth();

  if (enforceProtectedAuth && session.auth.source !== "persistent") {
    redirect(buildAuthSignInPath(targetPath));
  }

  if (!canAccessRoles(session.role, allowedRoles)) {
    redirect(
      enforceProtectedAuth
        ? getCanonicalRouteForRole(session.role)
        : buildForbiddenHref(targetPath, allowedRoles),
    );
  }

  return session;
}

function buildCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  const cookiesForHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  return cookiesForHeader.length > 0 ? cookiesForHeader.join("; ") : null;
}
