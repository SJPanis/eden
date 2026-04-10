import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

// Imagine Auto commission split for verified supplier sales:
// 89% → Supplier (realBalance — withdrawable)
// 1%  → Nate / service operator (realBalance — withdrawable commission)
// 5%  → Sonny / service owner profit (realBalance — withdrawable)
// 5%  → Eden platform (PlatformRevenue + ContributionPool)
const SUPPLIER_PCT = 0.89;
const OPERATOR_PCT = 0.01;
const OWNER_PCT = 0.05;
const PLATFORM_PCT = 0.05;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const amount = typeof body?.amount === "number" ? Math.floor(body.amount) : null;
  const supplierId = typeof body?.supplierId === "string" ? body.supplierId.trim() : null;
  const operatorId = typeof body?.operatorId === "string" ? body.operatorId.trim() : null;
  const partDescription = typeof body?.partDescription === "string" ? body.partDescription : "Auto part";

  if (!amount || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
  }

  const prisma = getPrismaClient();

  // Look up buyer
  const buyer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, promoBalance: true, realBalance: true, createdAt: true },
  });
  if (!buyer) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const totalSpendable = buyer.promoBalance + buyer.realBalance;
  if (totalSpendable < amount) {
    return NextResponse.json({
      ok: false,
      error: "Insufficient Leaf balance",
      balance: totalSpendable,
      required: amount,
    }, { status: 402 });
  }

  // Deduct promo first, then real (three-bucket system)
  const promoSpent = Math.min(amount, buyer.promoBalance);
  const realSpent = amount - promoSpent;

  // Calculate splits
  const supplierCut = Math.floor(amount * SUPPLIER_PCT);
  const operatorCut = Math.floor(amount * OPERATOR_PCT);
  const ownerCut = Math.floor(amount * OWNER_PCT);
  const platformCut = amount - supplierCut - operatorCut - ownerCut; // remainder to platform (ensures 100%)

  // For routing earnings to the correct bucket, use the real/promo proportion
  const realRatio = amount > 0 ? realSpent / amount : 0;

  // Look up the platform owner (Sonny)
  const ownerUsername = process.env.EDEN_OWNER_USERNAME ?? process.env.OWNER_USERNAME ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Deduct from buyer
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          promoBalance: { decrement: promoSpent },
          realBalance: { decrement: realSpent },
          edenBalanceCredits: { decrement: amount },
          lifetimePromoSpent: { increment: promoSpent },
          lifetimeRealSpent: { increment: realSpent },
        },
      });

      // 2. Credit supplier (89%) — real portion goes to realBalance (withdrawable)
      if (supplierId) {
        const supplierReal = Math.floor(supplierCut * realRatio);
        const supplierPromo = supplierCut - supplierReal;
        await tx.user.update({
          where: { id: supplierId },
          data: {
            realBalance: { increment: supplierReal },
            promoBalance: { increment: supplierPromo },
            edenBalanceCredits: { increment: supplierCut },
          },
        });
      }

      // 3. Credit operator / Nate (1%) — real earnings (withdrawable commission)
      if (operatorId) {
        const operatorReal = Math.floor(operatorCut * realRatio);
        const operatorPromo = operatorCut - operatorReal;
        await tx.user.update({
          where: { id: operatorId },
          data: {
            realBalance: { increment: operatorReal },
            promoBalance: { increment: operatorPromo },
            edenBalanceCredits: { increment: operatorCut },
          },
        });
      }

      // 4. Credit owner / Sonny (5%) — real earnings (withdrawable)
      if (ownerUsername) {
        const owner = await tx.user.findUnique({ where: { username: ownerUsername }, select: { id: true } });
        if (owner) {
          const ownerReal = Math.floor(ownerCut * realRatio);
          const ownerPromo = ownerCut - ownerReal;
          await tx.user.update({
            where: { id: owner.id },
            data: {
              realBalance: { increment: ownerReal },
              promoBalance: { increment: ownerPromo },
              edenBalanceCredits: { increment: ownerCut },
            },
          });
        }
      }

      // 5. Platform (5%) — split between platform revenue and contribution pool
      const platformRevenueCut = Math.floor(platformCut * 0.6); // 3% of total
      const poolCut = platformCut - platformRevenueCut;           // 2% of total
      await tx.platformRevenue.create({
        data: {
          amountLeafs: platformRevenueCut,
          usdValue: platformRevenueCut / 25,
          sourceService: "imagine-auto",
          userId: session.user.id,
        },
      });
      await tx.contributionPool.create({
        data: {
          amountLeafs: poolCut,
          sourceService: "imagine-auto",
          userId: session.user.id,
        },
      });
    });

    // Fetch updated balance
    const updatedBuyer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { edenBalanceCredits: true },
    });

    return NextResponse.json({
      ok: true,
      spent: amount,
      newBalance: updatedBuyer?.edenBalanceCredits ?? 0,
      message: "Order placed. SimonOS will contact you within 24 hours to arrange delivery.",
      split: { supplier: supplierCut, operator: operatorCut, owner: ownerCut, platform: platformCut },
    });
  } catch (error) {
    console.error("[imagine-auto/purchase] Error:", error);
    return NextResponse.json({ ok: false, error: "Purchase failed. No Leafs were charged." }, { status: 500 });
  }
}
