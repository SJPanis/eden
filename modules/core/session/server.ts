import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EdenRole } from "@/modules/core/config/role-nav";
import {
  logSessionResolution,
  persistentSessionCookieName,
  resolveAuthSessionMode,
} from "@/modules/core/session/auth-runtime";
import {
  buildForbiddenHref,
  canAccessRoles,
  mockSessionCookieName,
  resolveMockSession,
} from "@/modules/core/session/mock-session";
import {
  mockOnboardingCookieName,
  parseMockOnboardingCookie,
} from "@/modules/core/session/mock-onboarding";
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

  if (authMode !== "mock_only") {
    logSessionResolution(
      authMode,
      "mock",
      fallbackUserId ? "mock_cookie" : "default_fallback",
      "Persistent auth is not yet authoritative, so the server session fell back to the mock cookie path.",
    );
  }

  return session;
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
  cookieStore.set(persistentSessionCookieName, session.user.id, mockSessionCookieOptions);

  return session;
}

export async function requireMockAccess(allowedRoles: EdenRole[], targetPath: string) {
  return requireAccess(allowedRoles, targetPath);
}

export async function requireAccess(allowedRoles: EdenRole[], targetPath: string) {
  const session = await getServerSession();

  if (!canAccessRoles(session.role, allowedRoles)) {
    redirect(buildForbiddenHref(targetPath, allowedRoles));
  }

  return session;
}
