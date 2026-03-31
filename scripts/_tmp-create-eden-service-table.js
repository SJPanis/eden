// Migration: Create EdenService table
// Run via: railway run node scripts/_tmp-create-eden-service-table.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EdenService" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "leafCost" INTEGER NOT NULL DEFAULT 5,
        "creatorId" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "totalEarned" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EdenService_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "EdenService_slug_key" ON "EdenService" ("slug")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "EdenService_creatorId_idx" ON "EdenService" ("creatorId")`
    );
    console.log("[migration] Created EdenService table with indexes");
  } catch (err) {
    console.error("[migration] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
