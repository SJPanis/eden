import { NextResponse } from "next/server";
import { getWalletTransactionState } from "@/modules/core/credits/server";
import { loadCreditsTopUpConfirmationResult } from "@/modules/core/payments/credits-topup-payment-service";
import { getServerSession } from "@/modules/core/session/server";

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

  const session = await getServerSession();
  const { effectiveTransactions } = await getWalletTransactionState();

  try {
    const confirmation = await loadCreditsTopUpConfirmationResult({
      providerSessionId: sessionId,
      userId: session.user.id,
      currentTransactions: effectiveTransactions,
    });

    if (confirmation.status !== "settled") {
      return NextResponse.json({
        ok: true,
        status: confirmation.status,
        providerLabel:
          confirmation.payment?.provider === "stripe"
            ? "Stripe Checkout"
            : (confirmation.payment?.provider ?? "Stripe Checkout"),
        message: confirmation.message,
      });
    }

    return NextResponse.json({
      ok: true,
      status: confirmation.status,
      transactionId: confirmation.transaction.id,
      transactionTitle: confirmation.transaction.title,
      transactionTimestamp: confirmation.transaction.timestamp,
      amountLabel: confirmation.transaction.amountLabel,
      creditsUsed: confirmation.creditsAdded,
      creditsDelta: confirmation.transaction.creditsDelta,
      previousBalanceCredits: confirmation.previousBalanceCredits,
      nextBalanceCredits: confirmation.nextBalanceCredits,
      providerLabel: confirmation.providerLabel,
      settlementSummary: confirmation.settlementSummary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm the payment-backed Leaf’s top-up.",
      },
      { status: 400 },
    );
  }
}
