// Prisma client regenerated — contribution layer active
import { NextResponse } from "next/server";
import { getServerSession } from "@/modules/core/session/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession();
  if (session.auth.source !== "persistent" || session.user.role !== "owner") {
    return NextResponse.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const prisma = getPrismaClient();
  const results: string[] = [];

  const migrations = [
    // EdenService builder columns
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'published'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Other'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "pricingModel" TEXT NOT NULL DEFAULT 'per_use'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "serviceType" TEXT NOT NULL DEFAULT 'claude'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "systemPrompt" TEXT`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "inputSchema" TEXT`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "outputFormat" TEXT NOT NULL DEFAULT 'text'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "thumbnailColor" TEXT NOT NULL DEFAULT '#2dd4bf'`,
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public'`,
    // AgentBuild context column
    `ALTER TABLE "AgentBuild" ADD COLUMN IF NOT EXISTS "context" TEXT NOT NULL DEFAULT '{}'`,
    // User TOTP columns
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpVerifiedAt" TIMESTAMP(3)`,
    // User email column
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`,
    // ServiceRelease table
    `CREATE TABLE IF NOT EXISTS "ServiceRelease" (
      "id" TEXT NOT NULL,
      "serviceId" TEXT NOT NULL,
      "version" TEXT NOT NULL,
      "notes" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'staged',
      "systemPrompt" TEXT,
      "inputSchema" TEXT,
      "outputFormat" TEXT NOT NULL DEFAULT 'text',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ServiceRelease_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ServiceRelease_serviceId_idx" ON "ServiceRelease" ("serviceId")`,
    // Email unique index
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email") WHERE "email" IS NOT NULL`,
    // Contribution layer
    `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "contributionsEnabled" BOOLEAN NOT NULL DEFAULT false`,
    `CREATE TABLE IF NOT EXISTS "ContributionRequest" (
      "id" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "creatorId" TEXT NOT NULL,
      "title" TEXT NOT NULL, "description" TEXT NOT NULL, "rewardPercent" INTEGER NOT NULL DEFAULT 5,
      "status" TEXT NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ContributionRequest_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ContributionRequest_serviceId_idx" ON "ContributionRequest" ("serviceId")`,
    `CREATE TABLE IF NOT EXISTS "Contribution" (
      "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "contributorId" TEXT NOT NULL,
      "serviceId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
      "proposedSystemPrompt" TEXT, "status" TEXT NOT NULL DEFAULT 'pending',
      "rewardPercent" INTEGER NOT NULL DEFAULT 0, "totalEarned" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "Contribution_requestId_idx" ON "Contribution" ("requestId")`,
    `CREATE INDEX IF NOT EXISTS "Contribution_contributorId_idx" ON "Contribution" ("contributorId")`,
    `CREATE INDEX IF NOT EXISTS "Contribution_serviceId_idx" ON "Contribution" ("serviceId")`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push("OK: " + sql.slice(0, 60));
    } catch (e) {
      results.push("SKIP: " + String(e).slice(0, 100));
    }
  }

  // Count services
  const serviceCount = await prisma.edenService.count();

  // List services with status
  const services = await prisma.edenService.findMany({
    select: { slug: true, status: true, isActive: true },
  });

  return NextResponse.json({ ok: true, results, serviceCount, services });
}
