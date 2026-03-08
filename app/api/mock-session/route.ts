import { NextResponse } from "next/server";
import {
  mockSessionCookieName,
  resolveMockSession,
} from "@/modules/core/session/mock-session";
import {
  persistentSessionCookieName,
  resolveAuthSessionMode,
} from "@/modules/core/session/auth-runtime";
import {
  getSanitizedMockOnboardingProfile,
  mockOnboardingCookieName,
  type EdenMockOnboardingProfile,
  serializeMockOnboardingCookie,
} from "@/modules/core/session/mock-onboarding";

const mockSessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    userId?: string;
    onboarding?: Partial<EdenMockOnboardingProfile>;
  };
  const onboardingProfile = requestBody.onboarding
    ? getSanitizedMockOnboardingProfile(requestBody.onboarding)
    : null;

  if (requestBody.onboarding && !onboardingProfile) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock onboarding payload.",
      },
      { status: 400 },
    );
  }

  const session = resolveMockSession(
    requestBody.userId ?? onboardingProfile?.selectedUserId,
    {
      auth: {
        mode: resolveAuthSessionMode(),
        source: "mock",
        resolver: "mock_cookie",
        sessionKey: requestBody.userId ?? onboardingProfile?.selectedUserId ?? null,
      },
    },
  );
  const response = NextResponse.json({
    ok: true,
    role: session.role,
    userId: session.user.id,
  });

  response.cookies.set(mockSessionCookieName, session.user.id, mockSessionCookieOptions);
  // This development-only bridge keeps the current session switcher useful while the real
  // auth resolver is introduced behind the existing session boundary.
  response.cookies.set(
    persistentSessionCookieName,
    session.user.id,
    mockSessionCookieOptions,
  );

  if (onboardingProfile) {
    response.cookies.set(
      mockOnboardingCookieName,
      serializeMockOnboardingCookie(onboardingProfile),
      mockSessionCookieOptions,
    );
  }

  return response;
}
