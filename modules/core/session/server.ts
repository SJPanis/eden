import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { EdenRole } from "@/modules/core/config/role-nav";
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

const mockSessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function getMockSession() {
  const cookieStore = await cookies();
  return resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);
}

export async function getMockOnboardingProfile() {
  const cookieStore = await cookies();
  return parseMockOnboardingCookie(cookieStore.get(mockOnboardingCookieName)?.value);
}

export async function persistMockSession(userId: string) {
  const session = resolveMockSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(mockSessionCookieName, session.user.id, mockSessionCookieOptions);

  return session;
}

export async function requireMockAccess(allowedRoles: EdenRole[], targetPath: string) {
  const session = await getMockSession();

  if (!canAccessRoles(session.role, allowedRoles)) {
    redirect(buildForbiddenHref(targetPath, allowedRoles));
  }

  return session;
}
