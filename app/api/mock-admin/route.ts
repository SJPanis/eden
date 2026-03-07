import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyMockAdminAction,
  mockAdminStateCookieName,
  parseMockAdminStateCookie,
  serializeMockAdminStateCookie,
  type EdenMockAdminAction,
} from "@/modules/core/admin/mock-admin-state";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";

const mockAdminCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

const allowedAdminActions = new Set<EdenMockAdminAction>([
  "freeze_user",
  "unfreeze_user",
  "freeze_business",
  "unfreeze_business",
  "toggle_maintenance",
]);

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    action?: EdenMockAdminAction;
    userId?: string;
    businessId?: string;
  };
  const requestedAction = requestBody.action;

  if (!requestedAction || !allowedAdminActions.has(requestedAction)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock admin action.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);

  if (session.role !== "owner") {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock admin actions require owner access.",
      },
      { status: 403 },
    );
  }

  const currentState = parseMockAdminStateCookie(
    cookieStore.get(mockAdminStateCookieName)?.value,
  );
  const nextState = applyMockAdminAction({
    action: requestedAction,
    adminState: currentState,
    actor: session.user.displayName,
    userId: requestBody.userId,
    businessId: requestBody.businessId,
  });

  if (!nextState) {
    return NextResponse.json(
      {
        ok: false,
        error: "The requested mock admin action is missing a valid target.",
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    adminState: nextState,
  });

  response.cookies.set(
    mockAdminStateCookieName,
    serializeMockAdminStateCookie(nextState),
    mockAdminCookieOptions,
  );

  return response;
}
