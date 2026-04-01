const { PrismaClient } = require("@prisma/client");
async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ServiceRelease" (
        "id" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "version" TEXT NOT NULL,
        "notes" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'staged',
        "systemPrompt" TEXT, "inputSchema" TEXT,
        "outputFormat" TEXT NOT NULL DEFAULT 'text',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ServiceRelease_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ServiceRelease_serviceId_idx" ON "ServiceRelease" ("serviceId")`);
    console.log("[migration] Created ServiceRelease table");
  } catch (err) { console.error(err.message); process.exit(1); }
  finally { await prisma.$disconnect(); }
}
main();
