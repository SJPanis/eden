import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMockCreatedBusinessState, mockCreatedBusinessCookieName, parseMockCreatedBusinessCookie } from "@/modules/core/business/mock-created-business";
import {
  getSanitizedMockWorkspaceServiceInput,
  mockWorkspaceServicesCookieName,
  parseMockWorkspaceServicesCookie,
  serializeMockWorkspaceServicesCookie,
  type EdenMockWorkspaceServiceInput,
} from "@/modules/core/business/mock-workspace-services";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import {
  mockPipelineCookieName,
  parseMockPipelineCookie,
  serializeMockPipelineCookie,
} from "@/modules/core/pipeline/mock-pipeline";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";
import { getBusinessById } from "@/modules/core/services";
import { createBuilderLoopWriteService } from "@/modules/core/services";

const mockCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};
const builderLoopWriteService = createBuilderLoopWriteService();

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as Partial<EdenMockWorkspaceServiceInput> & {
    businessId?: string;
  };
  const input = getSanitizedMockWorkspaceServiceInput(requestBody);

  if (!input) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock service payload.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);

  if (session.role === "consumer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Service Builder requires business or owner access.",
      },
      { status: 403 },
    );
  }

  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const businessId = resolveBusinessContext(
    session.user.id,
    requestBody.businessId,
    createdBusiness,
  );

  if (!businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "No active business workspace is available for this service draft.",
      },
      { status: 404 },
    );
  }

  const business = getBusinessById(businessId, { createdBusiness });

  if (!business) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to resolve the active business workspace.",
      },
      { status: 404 },
    );
  }

  const currentWorkspaceServices = parseMockWorkspaceServicesCookie(
    cookieStore.get(mockWorkspaceServicesCookieName)?.value,
  );
  const currentPipelineRecords = parseMockPipelineCookie(
    cookieStore.get(mockPipelineCookieName)?.value,
  );
  const result = await builderLoopWriteService.createServiceDraft({
    input,
    businessId,
    ownerUserId: business.ownerUserId,
    currentWorkspaceServices,
    currentPipelineRecords,
  });
  const response = NextResponse.json({
    ok: true,
    businessId,
    serviceId: result.workspaceServiceRecord.serviceId,
  });

  response.cookies.set(
    mockWorkspaceServicesCookieName,
    serializeMockWorkspaceServicesCookie(result.nextWorkspaceServices),
    mockCookieOptions,
  );
  response.cookies.set(
    mockPipelineCookieName,
    serializeMockPipelineCookie(result.nextPipelineRecords),
    mockCookieOptions,
  );

  return response;
}
