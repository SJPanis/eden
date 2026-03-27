// Migration: Add TOTP fields to User table
// Run via: railway run node scripts/_tmp-add-totp-fields.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpVerifiedAt" TIMESTAMP(3)`
    );
    console.log("[migration] Added TOTP fields to User table");
  } catch (err) {
    console.error("[migration] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
