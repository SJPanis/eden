const { PrismaClient } = require("@prisma/client");
async function main() {
  const prisma = new PrismaClient();
  try {
    const cols = [
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Other'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "pricingModel" TEXT NOT NULL DEFAULT 'per_use'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "serviceType" TEXT NOT NULL DEFAULT 'claude'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "systemPrompt" TEXT`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "inputSchema" TEXT`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "outputFormat" TEXT NOT NULL DEFAULT 'text'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "thumbnailColor" TEXT NOT NULL DEFAULT '#2dd4bf'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft'`,
      `ALTER TABLE "EdenService" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public'`,
    ];
    for (const sql of cols) await prisma.$executeRawUnsafe(sql);
    console.log("[migration] Added service builder fields to EdenService");
  } catch (err) { console.error("[migration] Failed:", err.message); process.exit(1); }
  finally { await prisma.$disconnect(); }
}
main();
