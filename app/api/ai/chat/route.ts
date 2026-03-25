import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getUserCreditsBalance,
  mockTransactionsCookieName,
  parseMockTransactionsCookie,
  serializeMockTransactionsCookie,
} from "@/modules/core/credits/mock-credits";
import { getWalletTransactionState } from "@/modules/core/credits/server";
import { getServerSession } from "@/modules/core/session/server";
import { recordServiceUsageEvent } from "@/modules/core/services/service-usage-service";
import type { EdenMockTransaction } from "@/modules/core/mock-data";

// ── Constants ────────────────────────────────────────────────────────────────

// 1 Leaf per 500 tokens, minimum 1
const LEAVES_PER_500_TOKENS = 1;
const TOKENS_PER_LEAF_BUCKET = 500;

// 15% platform commission — matches Eden's platform fee rate
const PLATFORM_FEE_RATE = 0.15;

// Sentinel service ID for AI chat usage records (no FK constraint on ServiceUsage.serviceId)
const EDEN_AI_CHAT_SERVICE_ID = "eden-ai-chat";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const mockTransactionsCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
  sameSite: "lax" as const,
};

// ── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIChatResponse = {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeLeavesCharged(totalTokens: number): number {
  return Math.max(LEAVES_PER_500_TOKENS, Math.ceil(totalTokens / TOKENS_PER_LEAF_BUCKET));
}

function computeFees(leavesCharged: number): {
  platformFee: number;
  builderEarnings: number;
} {
  const platformFee = Math.max(1, Math.round(leavesCharged * PLATFORM_FEE_RATE));
  const builderEarnings = leavesCharged - platformFee;
  return { platformFee, builderEarnings };
}

function buildAiChatTransactionId(executionKey: string) {
  return `ai-chat-usage-${executionKey}`;
}

function buildAiChatTransaction(input: {
  id: string;
  userId: string;
  leavesCharged: number;
  model: string;
}): EdenMockTransaction {
  return {
    id: input.id,
    userId: input.userId,
    title: "Eden AI Chat",
    amountLabel: `-${input.leavesCharged} Leaf's`,
    creditsDelta: -input.leavesCharged,
    direction: "outflow",
    kind: "usage",
    detail: `AI chat session with ${input.model}. ${input.leavesCharged} Leaf's charged (15% platform commission applied).`,
    timestamp: "Just now",
    simulated: false,
  };
}

// ── Route ────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function POST(request: Request) {
  // ── Auth ──
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json(
      { ok: false, error: "Authentication required to use Eden AI." },
      { status: 401 },
    );
  }

  // ── Parse body ──
  const body = (await request.json().catch(() => null)) as {
    messages?: ChatMessage[];
    model?: string;
    executionKey?: string;
  } | null;

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const model =
    typeof body?.model === "string" && body.model.trim()
      ? body.model.trim()
      : (process.env.EDEN_SANDBOX_OPENAI_MODEL ?? "gpt-4.1-mini");
  const executionKey =
    typeof body?.executionKey === "string" && body.executionKey.trim()
      ? body.executionKey.trim()
      : `ai-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one message is required." },
      { status: 400 },
    );
  }

  // ── Balance check (pre-flight: need at least 1 Leaf) ──
  const cookieStore = await cookies();
  const { cookieTransactions, effectiveTransactions } = await getWalletTransactionState();
  const currentBalance = getUserCreditsBalance(session.user.id, effectiveTransactions);

  if (currentBalance < 1) {
    return NextResponse.json(
      {
        ok: false,
        error: "Insufficient Leaf's. Top up your balance to use Eden AI.",
        insufficientBalance: true,
        currentBalanceCredits: currentBalance,
      },
      { status: 409 },
    );
  }

  // ── Idempotency check ──
  const existingRecord = await recordServiceUsageEvent({
    serviceId: EDEN_AI_CHAT_SERVICE_ID,
    userId: session.user.id,
    executionKey,
    usageType: "live_service_execution",
    creditsUsed: 0, // placeholder — only used if this is a real create
  }).catch(() => null);

  // If it was a duplicate (already recorded), return early
  if (existingRecord?.duplicate) {
    return NextResponse.json(
      { ok: false, error: "This execution key has already been used." },
      { status: 409 },
    );
  }

  // ── Call OpenAI (server-side only — OPENAI_API_KEY never leaves the server) ──
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Eden AI is not configured on this instance." },
      { status: 503 },
    );
  }

  let openAiResponse: OpenAIChatResponse;
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[eden-ai-chat] OpenAI error:", res.status, errText);
      return NextResponse.json(
        { ok: false, error: "Eden AI provider returned an error. Try again shortly." },
        { status: 502 },
      );
    }

    openAiResponse = (await res.json()) as OpenAIChatResponse;
  } catch (err) {
    console.error("[eden-ai-chat] Fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "Eden AI is temporarily unreachable." },
      { status: 503 },
    );
  }

  const content = openAiResponse.choices[0]?.message?.content ?? "";
  const { prompt_tokens, completion_tokens, total_tokens } = openAiResponse.usage ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  // ── Compute Leaf charge ──
  const leavesCharged = computeLeavesCharged(total_tokens);
  const { platformFee, builderEarnings } = computeFees(leavesCharged);

  // Clamp to actual balance so we never overdraft
  const actualCharge = Math.min(leavesCharged, currentBalance);
  const actualPlatformFee = Math.min(platformFee, actualCharge);
  const actualBuilderEarnings = actualCharge - actualPlatformFee;

  // ── Persist usage event ──
  // We already attempted a create above (idempotency check). Since it wasn't a
  // duplicate, we need to record the real event. Use a new key with the actual amounts.
  const usageKey = `${executionKey}-settled`;
  await recordServiceUsageEvent({
    serviceId: EDEN_AI_CHAT_SERVICE_ID,
    userId: session.user.id,
    executionKey: usageKey,
    usageType: "live_service_execution",
    creditsUsed: actualCharge,
    grossCredits: actualCharge,
    platformFeeCredits: actualPlatformFee,
    builderEarningsCredits: actualBuilderEarnings,
  });

  // ── Write cookie transaction for immediate UI balance update ──
  const transactionId = buildAiChatTransactionId(usageKey);
  const newTransaction = buildAiChatTransaction({
    id: transactionId,
    userId: session.user.id,
    leavesCharged: actualCharge,
    model,
  });

  const alreadyCookied = effectiveTransactions.some((t) => t.id === transactionId);
  const nextCookieTransactions = alreadyCookied
    ? cookieTransactions
    : [newTransaction, ...cookieTransactions].slice(0, 40);

  const nextBalance = currentBalance - actualCharge;

  const response = NextResponse.json({
    ok: true,
    content,
    usage: {
      promptTokens: prompt_tokens,
      completionTokens: completion_tokens,
      totalTokens: total_tokens,
      leavesCharged: actualCharge,
      platformFee: actualPlatformFee,
      builderEarnings: actualBuilderEarnings,
      previousBalanceCredits: currentBalance,
      nextBalanceCredits: nextBalance,
    },
  });

  response.cookies.set(
    mockTransactionsCookieName,
    serializeMockTransactionsCookie(nextCookieTransactions),
    mockTransactionsCookieOptions,
  );

  return response;
}
