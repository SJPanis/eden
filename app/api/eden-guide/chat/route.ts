import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EDEN_RESPONSES: Record<string, string> = {
  default: "I'm your Eden Guide. I can help you discover services, understand how Leafs work, navigate the marketplace, or learn about contributing. What would you like to know?",
  leafs: "Leafs are Eden's internal currency. You can top up Leafs with real money through Stripe, then spend them to run AI services. Every service shows its Leaf cost upfront — no hidden fees. You start with 50 free Leafs when you sign up.",
  services: "Eden's marketplace has AI-powered services you can run instantly. Each service has a Leaf cost per use. Try Market Lens for stock analysis, Imagine Auto for parts search, or Spot Splore for music discovery. Visit the marketplace to browse all available services.",
  earn: "There are two ways to earn in Eden: publish your own AI service as an Innovator (you earn 70% of every run), or contribute improvements to existing services as a Contributor (you earn from the contribution pool). Head to the Innovator tab to get started.",
  topup: "To add Leafs, click the '+ Top Up' button in the nav bar or visit /topup. We offer packages starting at $10. Payments are processed securely through Stripe.",
  build: "To build a service, go to the Innovator tab and use the Service Builder. It's a 4-step wizard: name your service, describe what it does, set the Leaf price, and publish. Eden's AI agents can also propose new services automatically through the Layer 2 system.",
};

function getResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("leaf") || lower.includes("currency") || lower.includes("credit")) return EDEN_RESPONSES.leafs;
  if (lower.includes("service") || lower.includes("marketplace") || lower.includes("discover")) return EDEN_RESPONSES.services;
  if (lower.includes("earn") || lower.includes("money") || lower.includes("paid") || lower.includes("innovator")) return EDEN_RESPONSES.earn;
  if (lower.includes("top up") || lower.includes("topup") || lower.includes("buy") || lower.includes("pay") || lower.includes("stripe")) return EDEN_RESPONSES.topup;
  if (lower.includes("build") || lower.includes("create") || lower.includes("publish")) return EDEN_RESPONSES.build;
  return EDEN_RESPONSES.default;
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json() as { message: string };
    const response = getResponse(message);
    return NextResponse.json({ ok: true, response });
  } catch {
    return NextResponse.json({ ok: false, response: "Something went wrong. Please try again." });
  }
}
