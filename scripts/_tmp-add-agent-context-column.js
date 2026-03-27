// Migration: Add context column to AgentBuild table
// Run via: node scripts/_tmp-add-agent-context-column.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AgentBuild" ADD COLUMN IF NOT EXISTS "context" TEXT NOT NULL DEFAULT '{}'`
    );
    console.log("[migration] Added context column to AgentBuild");
  } catch (err) {
    console.error("[migration] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
