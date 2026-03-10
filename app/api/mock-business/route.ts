import { NextResponse } from "next/server";
import {
  defaultBusinessCreationUserId,
  getSanitizedMockCreatedBusinessInput,
  mockCreatedBusinessCookieName,
  serializeMockCreatedBusinessCookie,
  type EdenMockCreatedBusinessInput,
} from "@/modules/core/business/mock-created-business";
import { mockSessionCookieName } from "@/modules/core/session/mock-session";
import { getServerSession } from "@/modules/core/session/server";
import { createBuilderLoopWriteService } from "@/modules/core/services";

const mockCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};
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

  const session = await getServerSession();

  if (session.role === "consumer") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only builders and the owner can create Eden businesses.",
      },
      { status: 403 },
    );
  }

  const targetUserId = session.user.id || defaultBusinessCreationUserId;
  const builderLoopWriteService = createBuilderLoopWriteService({
    writeMode: "real_only",
  });

  let result;

  try {
    result = await builderLoopWriteService.createBusiness({
      input,
      ownerUserId: targetUserId,
      targetUserId,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown business creation error";
    console.error(`[eden][business-create] ${detail}`);

    return NextResponse.json(
      {
        ok: false,
        error: "Eden could not create the business workspace. Try again once persistence is available.",
      },
      { status: 500 },
    );
  }

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

  if (session.auth.source === "mock") {
    response.cookies.set(mockSessionCookieName, result.targetUserId, mockCookieOptions);
  }

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
