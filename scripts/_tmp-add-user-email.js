// Migration: Add email column to User table
// Run via: railway run node scripts/_tmp-add-user-email.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`
    );
    // Add unique index (ignoring nulls)
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email") WHERE "email" IS NOT NULL`
    );
    console.log("[migration] Added email column with unique index to User table");
  } catch (err) {
    console.error("[migration] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
