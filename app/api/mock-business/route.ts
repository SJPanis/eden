import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  defaultBusinessCreationUserId,
  getSanitizedMockCreatedBusinessInput,
  mockCreatedBusinessCookieName,
  serializeMockCreatedBusinessCookie,
  type EdenMockCreatedBusinessInput,
} from "@/modules/core/business/mock-created-business";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";
import { createBuilderLoopWriteService } from "@/modules/core/services";

const mockCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};
const builderLoopWriteService = createBuilderLoopWriteService();

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as Partial<EdenMockCreatedBusinessInput>;
  const input = getSanitizedMockCreatedBusinessInput(requestBody);

  if (!input) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock business creation payload.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);
  const targetUserId =
    session.role === "business" ? session.user.id : defaultBusinessCreationUserId;
  const result = await builderLoopWriteService.createBusiness({
    input,
    ownerUserId: targetUserId,
    targetUserId,
  });
  const response = NextResponse.json({
    ok: true,
    businessId: result.record.businessId,
    userId: result.targetUserId,
    redirectTo: "/business",
  });

  response.cookies.set(
    mockCreatedBusinessCookieName,
    serializeMockCreatedBusinessCookie(result.record),
    mockCookieOptions,
  );
  response.cookies.set(mockSessionCookieName, result.targetUserId, mockCookieOptions);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    reset: "mock-business",
  });

  response.cookies.set(
    mockCreatedBusinessCookieName,
    serializeMockCreatedBusinessCookie(null),
    {
      ...mockCookieOptions,
      maxAge: 0,
    },
  );

  return response;
}
