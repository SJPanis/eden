import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getEffectiveMockAdminState,
  mockAdminStateCookieName,
  serializeMockAdminStateCookie,
} from "@/modules/core/admin/mock-admin-state";
import {
  mockBusinessAssistantHistoryCookieName,
  serializeMockBusinessAssistantHistoryCookie,
} from "@/modules/core/assistant/mock-business-assistant-history";
import {
  mockCreatedBusinessCookieName,
  serializeMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";
import {
  mockWorkspaceServicesCookieName,
  serializeMockWorkspaceServicesCookie,
} from "@/modules/core/business/mock-workspace-services";
import {
  mockTransactionsCookieName,
  serializeMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import {
  mockPipelineCookieName,
  mockPipelineEventsCookieName,
  serializeMockPipelineCookie,
  serializeMockPipelineEventsCookie,
} from "@/modules/core/pipeline/mock-pipeline";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";

const mockCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function DELETE() {
  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Reset all mock state requires owner access.",
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    reset: "all",
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie([]),
    mockCookieOptions,
  );
  response.cookies.set(
    mockPipelineCookieName,
    serializeMockPipelineCookie([]),
    mockCookieOptions,
  );
  response.cookies.set(
    mockPipelineEventsCookieName,
    serializeMockPipelineEventsCookie([]),
    mockCookieOptions,
  );
  response.cookies.set(
    mockAdminStateCookieName,
    serializeMockAdminStateCookie(getEffectiveMockAdminState(undefined)),
    mockCookieOptions,
  );
  response.cookies.set(
    mockCreatedBusinessCookieName,
    serializeMockCreatedBusinessCookie(null),
    {
      ...mockCookieOptions,
      maxAge: 0,
    },
  );
  response.cookies.set(
    mockWorkspaceServicesCookieName,
    serializeMockWorkspaceServicesCookie([]),
    mockCookieOptions,
  );
  response.cookies.set(
    mockBusinessAssistantHistoryCookieName,
    serializeMockBusinessAssistantHistoryCookie([]),
    mockCookieOptions,
  );

  return response;
}
