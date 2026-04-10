import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    database: "error",
    walletSchema: "error",
    stripe: "error",
  };
  const errors: Record<string, string> = {};

  // 1. Database connectivity
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    errors.database = err instanceof Error ? err.message : "Unknown DB error";
  }

  // 2. Three-bucket wallet schema — verify columns exist
  if (checks.database === "ok") {
    try {
      await getPrismaClient().$queryRaw`
        SELECT "promoBalance", "realBalance", "withdrawableBalance"
        FROM "User"
        LIMIT 1
      `;
      checks.walletSchema = "ok";
    } catch (err) {
      errors.walletSchema = err instanceof Error ? err.message : "Columns missing";
    }
  }

  // 3. Stripe env vars
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = "ok";
  } else {
    errors.stripe = "STRIPE_SECRET_KEY not set";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      ...checks,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
