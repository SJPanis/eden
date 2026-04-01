import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const PACKAGES: Record<string, { name: string; priceCents: number; leafs: number }> = {
  starter: { name: "Starter", priceCents: 1000, leafs: 275 },
  balanced: { name: "Balanced", priceCents: 3500, leafs: 1150 },
  highbalance: { name: "High Balance", priceCents: 8000, leafs: 3250 },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const packageId = typeof body?.packageId === "string" ? body.packageId : "";

  const pkg = PACKAGES[packageId];
  if (!pkg) {
    return NextResponse.json(
      { ok: false, error: `Invalid packageId. Must be one of: ${Object.keys(PACKAGES).join(", ")}` },
      { status: 400 },
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const origin = req.nextUrl.origin;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Eden Leafs — ${pkg.name}`,
              description: `${pkg.leafs} Leafs for Eden services`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        packageId,
        leafs: String(pkg.leafs),
      },
      success_url: `${origin}/topup?topped_up=true`,
      cancel_url: `${origin}/topup`,
    });

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
      packageId,
      leafs: pkg.leafs,
      priceCents: pkg.priceCents,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe checkout creation failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
