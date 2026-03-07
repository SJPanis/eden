import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearMockBusinessAssistantHistoryForBusiness,
  type EdenMockBusinessAssistantHistoryEntry,
  mockBusinessAssistantHistoryCookieName,
  parseMockBusinessAssistantHistoryCookie,
  serializeMockBusinessAssistantHistoryCookie,
  upsertMockBusinessAssistantHistoryEntry,
} from "@/modules/core/assistant/mock-business-assistant-history";
import {
  getMockCreatedBusinessState,
  mockCreatedBusinessCookieName,
  parseMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";
import { resolveBusinessContext } from "@/modules/core/credits/mock-credits";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";

const mockCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    businessId?: string;
    entry?: EdenMockBusinessAssistantHistoryEntry;
  };

  if (!requestBody.entry) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock assistant history payload.",
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
        error: "Business AI Assistant history requires business or owner access.",
      },
      { status: 403 },
    );
  }

  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const businessId = resolveBusinessContext(
    session.user.id,
    requestBody.businessId ?? requestBody.entry.businessId,
    createdBusiness,
  );

  if (!businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "No active mock business is available for assistant history.",
      },
      { status: 404 },
    );
  }

  const currentHistory = parseMockBusinessAssistantHistoryCookie(
    cookieStore.get(mockBusinessAssistantHistoryCookieName)?.value,
  );
  const nextEntry = {
    ...requestBody.entry,
    businessId,
  } satisfies EdenMockBusinessAssistantHistoryEntry;
  const nextHistory = upsertMockBusinessAssistantHistoryEntry(nextEntry, currentHistory);
  const response = NextResponse.json({
    ok: true,
    businessId,
    entryId: nextEntry.id,
  });

  response.cookies.set(
    mockBusinessAssistantHistoryCookieName,
    serializeMockBusinessAssistantHistoryCookie(nextHistory),
    mockCookieOptions,
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
        error: "Business AI Assistant history requires business or owner access.",
      },
      { status: 403 },
    );
  }

  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const requestedBusinessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  const businessId = resolveBusinessContext(
    session.user.id,
    requestedBusinessId,
    createdBusiness,
  );

  if (!businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "No active mock business is available for assistant history.",
      },
      { status: 404 },
    );
  }

  const currentHistory = parseMockBusinessAssistantHistoryCookie(
    cookieStore.get(mockBusinessAssistantHistoryCookieName)?.value,
  );
  const nextHistory = clearMockBusinessAssistantHistoryForBusiness(
    businessId,
    currentHistory,
  );
  const response = NextResponse.json({
    ok: true,
    businessId,
    cleared: true,
  });

  response.cookies.set(
    mockBusinessAssistantHistoryCookieName,
    serializeMockBusinessAssistantHistoryCookie(nextHistory),
    mockCookieOptions,
  );

  return response;
}
