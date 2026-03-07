import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getMockCreatedBusinessState,
  mockCreatedBusinessCookieName,
  parseMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";
import {
  getMockWorkspaceServiceStates,
  mockWorkspaceServicesCookieName,
  parseMockWorkspaceServicesCookie,
} from "@/modules/core/business/mock-workspace-services";
import {
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
  resolveBusinessContext,
} from "@/modules/core/credits/mock-credits";
import {
  applyPipelineAction,
  mockPipelineCookieName,
  mockPipelineEventsCookieName,
  parseMockPipelineCookie,
  parseMockPipelineEventsCookie,
  serializeMockPipelineCookie,
  serializeMockPipelineEventsCookie,
  type EdenMockPipelineAction,
} from "@/modules/core/pipeline/mock-pipeline";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";

const mockPipelineCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

const allowedPipelineActions = new Set<EdenMockPipelineAction>([
  "start_build",
  "send_to_testing",
  "mark_ready",
  "publish",
  "revert_to_draft",
]);

type MockPipelineResetScope = "pipeline" | "history" | "all";

const allowedResetScopes = new Set<MockPipelineResetScope>(["pipeline", "history", "all"]);

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    action?: EdenMockPipelineAction;
    businessId?: string;
  };
  const requestedAction = requestBody.action;

  if (!requestedAction || !allowedPipelineActions.has(requestedAction)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock pipeline action.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);
  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const workspaceServices = getMockWorkspaceServiceStates(
    parseMockWorkspaceServicesCookie(
      cookieStore.get(mockWorkspaceServicesCookieName)?.value,
    ),
  );

  if (session.role === "consumer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Business pipeline actions require business or owner access.",
      },
      { status: 403 },
    );
  }

  const businessId = resolveBusinessContext(
    session.user.id,
    requestBody.businessId,
    createdBusiness,
  );

  if (!businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "No active mock business is available for this pipeline action.",
      },
      { status: 404 },
    );
  }
  const simulatedTransactions = parseMockTransactionsCookie(
    cookieStore.get(mockTransactionsCookieName)?.value,
  );
  const currentRecords = parseMockPipelineCookie(cookieStore.get(mockPipelineCookieName)?.value);
  const currentEvents = parseMockPipelineEventsCookie(
    cookieStore.get(mockPipelineEventsCookieName)?.value,
  );
  const transition = applyPipelineAction({
    action: requestedAction,
    businessId,
    userId: session.user.id,
    actor: session.user.displayName,
    simulatedTransactions,
    records: currentRecords,
    events: currentEvents,
    createdBusiness,
    workspaceServices,
  });

  if (!transition) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to resolve a mock pipeline snapshot for this business.",
      },
      { status: 404 },
    );
  }

  if (!transition.applied) {
    return NextResponse.json(
      {
        ok: false,
        error: transition.reason ?? "This mocked pipeline action is unavailable.",
        status: transition.snapshot.status,
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    status: transition.snapshot.status,
  });

  response.cookies.set(
    mockPipelineCookieName,
    serializeMockPipelineCookie(transition.records),
    mockPipelineCookieOptions,
  );
  response.cookies.set(
    mockPipelineEventsCookieName,
    serializeMockPipelineEventsCookie(transition.events),
    mockPipelineCookieOptions,
  );

  return response;
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);

  if (session.role === "consumer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Mock pipeline resets require business or owner access.",
      },
      { status: 403 },
    );
  }

  const scope = new URL(request.url).searchParams.get("scope");
  const resolvedScope: MockPipelineResetScope = allowedResetScopes.has(
    (scope ?? "") as MockPipelineResetScope,
  )
    ? ((scope as MockPipelineResetScope) ?? "all")
    : "all";
  const response = NextResponse.json({
    ok: true,
    reset: resolvedScope,
  });

  if (resolvedScope === "pipeline" || resolvedScope === "all") {
    response.cookies.set(
      mockPipelineCookieName,
      serializeMockPipelineCookie([]),
      mockPipelineCookieOptions,
    );
  }

  if (resolvedScope === "history" || resolvedScope === "all") {
    response.cookies.set(
      mockPipelineEventsCookieName,
      serializeMockPipelineEventsCookie([]),
      mockPipelineCookieOptions,
    );
  }

  return response;
}
