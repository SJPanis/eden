import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordMockPayoutSettlement } from "@/modules/core/services/payout-settlement-service";
import {
  mockSessionCookieName,
  resolveMockSession,
} from "@/modules/core/session/mock-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    businessId?: string;
    amountCredits?: number;
    notes?: string;
    reference?: string;
    status?: "pending" | "settled" | "canceled";
  };
  const businessId = requestBody.businessId?.trim();
  const amountCredits = Number(requestBody.amountCredits);

  if (!businessId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A business id is required to record a payout settlement.",
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amountCredits) || amountCredits <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "A positive payout amount is required.",
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
        error: "Payout settlement actions require owner access.",
      },
      { status: 403 },
    );
  }

  const result = await recordMockPayoutSettlement({
    businessId,
    amountCredits: Math.round(amountCredits),
    status: requestBody.status ?? "settled",
    reference:
      requestBody.reference?.trim() ||
      `owner-manual-${businessId}-${Date.now().toString(36)}`,
    notes: requestBody.notes?.trim() || `Recorded by ${session.user.displayName}`,
  });

  if (!result.recorded || !result.settlement) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to record the payout settlement. Persistent payout history is currently unavailable.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    settlementId: result.settlement.id,
    amountCredits: result.settlement.amountCredits,
    status: result.settlement.status,
  });
}
