const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentBuild" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "request" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "totalLeafs" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AgentBuild_pkey" PRIMARY KEY ("id"))`);
  console.log("✓ AgentBuild table");
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AgentTask" ("id" TEXT NOT NULL, "buildId" TEXT NOT NULL, "index" INTEGER NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "result" TEXT, "leafCost" INTEGER NOT NULL DEFAULT 0, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id"))`);
  console.log("✓ AgentTask table");
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AgentTask_buildId_idx" ON "AgentTask"("buildId")`);
  console.log("✓ AgentTask index");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "AgentBuild"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    console.log("✓ AgentTask FK");
  } catch (e) {
    if (e.message && e.message.includes("already exists")) console.log("✓ AgentTask FK (already exists)");
    else throw e;
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
