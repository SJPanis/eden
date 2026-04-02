// Seed: update existing services to published status
// Run via: railway run node scripts/seed-service-status.js

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    // Count before
    const total = await prisma.edenService.count();
    console.log(`[seed] Total services in DB: ${total}`);

    // Update services with null/empty status
    const r1 = await prisma.$executeRawUnsafe(
      `UPDATE "EdenService" SET "status" = 'published' WHERE "status" IS NULL OR "status" = ''`
    );
    console.log(`[seed] Updated null/empty status: ${r1} rows`);

    // Update active services that are still draft
    const r2 = await prisma.edenService.updateMany({
      where: { isActive: true, status: "draft" },
      data: { status: "published" },
    });
    console.log(`[seed] Updated active drafts: ${r2.count} rows`);

    // List all services
    const all = await prisma.edenService.findMany({
      select: { slug: true, status: true, isActive: true },
    });
    console.log("[seed] All services:");
    for (const s of all) {
      console.log(`  ${s.slug}: status=${s.status}, isActive=${s.isActive}`);
    }
  } catch (err) {
    console.error("[seed] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
