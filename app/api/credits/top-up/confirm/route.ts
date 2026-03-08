import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getCreditsTopUpCookieName,
  getCreditsTopUpCookieValue,
  getCreditsTopUpSuccessMessage,
  creditsTopUpCookieOptions,
  confirmCreditsTopUpCheckout,
} from "@/modules/core/payments/stripe-topup-service";
import { getServerSession } from "@/modules/core/session/server";
import {
  parseMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
  };
  const sessionId = requestBody.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json(
      {
        ok: false,
        error: "A checkout session id is required to confirm this top-up.",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const session = await getServerSession();
  const currentTransactions = parseMockTransactionsCookie(
    cookieStore.get(getCreditsTopUpCookieName())?.value,
  );

  try {
    const confirmedTopUp = await confirmCreditsTopUpCheckout({
      sessionId,
      userId: session.user.id,
      currentTransactions,
    });
    const response = NextResponse.json({
      ok: true,
      alreadyApplied: confirmedTopUp.alreadyApplied,
      transactionId: confirmedTopUp.transaction.id,
      transactionTitle: confirmedTopUp.transaction.title,
      transactionTimestamp: confirmedTopUp.transaction.timestamp,
      amountLabel: confirmedTopUp.transaction.amountLabel,
      creditsDelta: confirmedTopUp.transaction.creditsDelta,
      creditsUsed: confirmedTopUp.creditsAdded,
      previousBalanceCredits: confirmedTopUp.previousBalanceCredits,
      nextBalanceCredits: confirmedTopUp.nextBalanceCredits,
      providerLabel: confirmedTopUp.providerLabel,
      settlementSummary: getCreditsTopUpSuccessMessage({
        creditsAmount: confirmedTopUp.creditsAdded,
        amountCents: confirmedTopUp.amountCents,
        currency: confirmedTopUp.currency,
      }),
    });

    if (!confirmedTopUp.alreadyApplied) {
      response.cookies.set(
        getCreditsTopUpCookieName(),
        getCreditsTopUpCookieValue(confirmedTopUp.nextTransactions),
        creditsTopUpCookieOptions,
      );
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm the payment-backed credits top-up.",
      },
      { status: 400 },
    );
  }
}
