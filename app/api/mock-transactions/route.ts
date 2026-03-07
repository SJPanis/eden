import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getMockCreatedBusinessState,
  mockCreatedBusinessCookieName,
  parseMockCreatedBusinessCookie,
} from "@/modules/core/business/mock-created-business";
import {
  buildSimulationTransaction,
  getSimulationTargetBusinessId,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
  serializeMockTransactionsCookie,
  type EdenMockSimulationAction,
} from "@/modules/core/credits/mock-credits";
import { mockSessionCookieName, resolveMockSession } from "@/modules/core/session/mock-session";

const mockTransactionsCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

const allowedSimulationActions = new Set<EdenMockSimulationAction>([
  "add_credits",
  "simulate_purchase",
  "simulate_hosting_fee",
  "simulate_service_usage",
]);

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    action?: EdenMockSimulationAction;
    businessId?: string;
  };
  const requestedAction = requestBody.action;

  if (!requestedAction || !allowedSimulationActions.has(requestedAction)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid mock simulation action.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = resolveMockSession(cookieStore.get(mockSessionCookieName)?.value);
  const createdBusiness = getMockCreatedBusinessState(
    parseMockCreatedBusinessCookie(cookieStore.get(mockCreatedBusinessCookieName)?.value),
  );
  const currentTransactions = parseMockTransactionsCookie(
    cookieStore.get(mockTransactionsCookieName)?.value,
  );
  const targetBusinessId = getSimulationTargetBusinessId(
    session.role,
    session.user.id,
    requestBody.businessId,
    createdBusiness,
  );
  const nextTransaction = buildSimulationTransaction({
    action: requestedAction,
    userId: session.user.id,
    businessId: targetBusinessId,
    transactionIndex: currentTransactions.length + 1,
    createdBusiness,
  });
  const nextTransactions = [nextTransaction, ...currentTransactions].slice(0, 40);
  const response = NextResponse.json({
    ok: true,
    transactionId: nextTransaction.id,
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie(nextTransactions),
    mockTransactionsCookieOptions,
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    reset: "ledger",
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie([]),
    mockTransactionsCookieOptions,
  );

  return response;
}
