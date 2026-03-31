// Seed: Insert known Eden services
// Run via: railway run node scripts/_tmp-seed-eden-services.js

const { PrismaClient } = require("@prisma/client");
const { randomBytes } = require("crypto");

function cuid() {
  return "c" + randomBytes(12).toString("hex").slice(0, 24);
}

const services = [
  { slug: "imagine-auto", name: "Imagine Auto", description: "AI-powered auto parts finder, visualizer, and diagnostic tool", leafCost: 10 },
  { slug: "market-lens", name: "Market Lens", description: "AI market analysis and trend intelligence tool", leafCost: 8 },
  { slug: "spot-splore", name: "Spot Splore", description: "Location-based discovery and constellation mapping service", leafCost: 5 },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    // Find the owner user (sonny)
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      select: { id: true, username: true },
    });

    if (!owner) {
      console.error("[seed] No owner user found. Create the owner account first.");
      process.exit(1);
    }

    console.log(`[seed] Using owner: ${owner.username} (${owner.id})`);

    let seeded = 0;
    for (const svc of services) {
      const existing = await prisma.edenService.findUnique({ where: { slug: svc.slug } });
      if (existing) {
        console.log(`[seed] ${svc.slug} already exists, skipping`);
        continue;
      }
      await prisma.edenService.create({
        data: {
          id: cuid(),
          slug: svc.slug,
          name: svc.name,
          description: svc.description,
          leafCost: svc.leafCost,
          creatorId: owner.id,
        },
      });
      console.log(`[seed] Created: ${svc.slug}`);
      seeded++;
    }
    console.log(`[seed] Seeded ${seeded} services`);
  } catch (err) {
    console.error("[seed] Failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
