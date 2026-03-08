import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { BusinessStatus, BusinessVisibility, PipelineStatus, Prisma } from "@prisma/client";

type DivergenceOptions = {
  dryRun: boolean;
};

const rootEnvPath = resolve(process.cwd(), ".env");

if (typeof process.loadEnvFile === "function" && existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options === "help") {
    printUsage();
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Hybrid read divergence is development-only. Refusing to run while NODE_ENV=production.",
    );
  }

  const { hybridReadDivergenceScenario } = await import(
    new URL("./hybrid-read-divergence-shared.ts", import.meta.url).href
  );

  console.info(
    `[eden-hybrid-read-divergence] Prepared scenario ${hybridReadDivergenceScenario.scenarioId} for ${hybridReadDivergenceScenario.business.id} / ${hybridReadDivergenceScenario.service.id}.`,
  );

  if (options.dryRun) {
    console.info(
      "[eden-hybrid-read-divergence] Dry run only. No PostgreSQL records were updated.",
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required. Run this script against a local PostgreSQL database after `npx prisma db push`.",
    );
  }

  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const prisma = getPrismaClient();

  try {
    const [user, business, service] = await Promise.all([
      prisma.user.findUnique({
        where: { id: hybridReadDivergenceScenario.user.id },
        select: { id: true },
      }),
      prisma.business.findUnique({
        where: { id: hybridReadDivergenceScenario.business.id },
        select: { id: true },
      }),
      prisma.service.findUnique({
        where: { id: hybridReadDivergenceScenario.service.id },
        select: { id: true },
      }),
    ]);

    const missingRecords = [
      !user ? `user ${hybridReadDivergenceScenario.user.id}` : null,
      !business ? `business ${hybridReadDivergenceScenario.business.id}` : null,
      !service ? `service ${hybridReadDivergenceScenario.service.id}` : null,
    ].filter(Boolean);

    if (missingRecords.length) {
      throw new Error(
        `Hybrid read divergence requires canonical records to exist first. Missing ${missingRecords.join(", ")}. Run \`npm run db:sync:canonical-marketplace\` before applying divergence.`,
      );
    }

    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      await transaction.user.update({
        where: { id: hybridReadDivergenceScenario.user.id },
        data: {
          displayName: hybridReadDivergenceScenario.user.displayName,
          summary: hybridReadDivergenceScenario.user.summary,
        },
      });

      await transaction.business.update({
        where: { id: hybridReadDivergenceScenario.business.id },
        data: {
          ownerUserId: hybridReadDivergenceScenario.business.ownerUserId,
          name: hybridReadDivergenceScenario.business.name,
          status: BusinessStatus.PUBLISHED,
          category: hybridReadDivergenceScenario.business.category,
          tags: hybridReadDivergenceScenario.business.tags,
          description: hybridReadDivergenceScenario.business.description,
          summary: hybridReadDivergenceScenario.business.summary,
          tagline: hybridReadDivergenceScenario.business.tagline,
          visibility: BusinessVisibility.PUBLISHED,
          publishReadinessPercent:
            hybridReadDivergenceScenario.business.publishReadinessPercent,
          nextMilestone: hybridReadDivergenceScenario.business.nextMilestone,
          featuredServiceId: hybridReadDivergenceScenario.business.featuredServiceId,
        },
      });

      await transaction.service.update({
        where: { id: hybridReadDivergenceScenario.service.id },
        data: {
          businessId: hybridReadDivergenceScenario.service.businessId,
          title: hybridReadDivergenceScenario.service.title,
          category: hybridReadDivergenceScenario.service.category,
          tags: hybridReadDivergenceScenario.service.tags,
          description: hybridReadDivergenceScenario.service.description,
          summary: hybridReadDivergenceScenario.service.summary,
          status: PipelineStatus.PUBLISHED,
          pricingModel: hybridReadDivergenceScenario.service.pricingModel,
          automationSummary: hybridReadDivergenceScenario.service.automationSummary,
          publishedAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
        },
      });

      const pipelineRecord = await transaction.pipelineRecord.upsert({
        where: {
          businessId_serviceId: {
            businessId: hybridReadDivergenceScenario.pipelineRecord.businessId,
            serviceId: hybridReadDivergenceScenario.pipelineRecord.serviceId,
          },
        },
        update: {
          status: PipelineStatus.PUBLISHED,
          buildStarted: true,
          lastActionLabel: hybridReadDivergenceScenario.pipelineRecord.lastActionLabel,
          updatedAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
        },
        create: {
          businessId: hybridReadDivergenceScenario.pipelineRecord.businessId,
          serviceId: hybridReadDivergenceScenario.pipelineRecord.serviceId,
          status: PipelineStatus.PUBLISHED,
          buildStarted: true,
          lastActionLabel: hybridReadDivergenceScenario.pipelineRecord.lastActionLabel,
          createdAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
          updatedAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
        },
        select: {
          id: true,
        },
      });

      await transaction.pipelineEvent.upsert({
        where: {
          id: `pipeline-event-${hybridReadDivergenceScenario.scenarioId}`,
        },
        update: {
          pipelineRecordId: pipelineRecord.id,
          businessId: hybridReadDivergenceScenario.pipelineRecord.businessId,
          serviceId: hybridReadDivergenceScenario.pipelineRecord.serviceId,
          previousStatus: PipelineStatus.TESTING,
          newStatus: PipelineStatus.PUBLISHED,
          actorLabel: "DB Divergence Seeder",
          detail:
            "Development-only PostgreSQL divergence appended this publish event for hybrid read verification.",
          occurredAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
          createdAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
        },
        create: {
          id: `pipeline-event-${hybridReadDivergenceScenario.scenarioId}`,
          pipelineRecordId: pipelineRecord.id,
          businessId: hybridReadDivergenceScenario.pipelineRecord.businessId,
          serviceId: hybridReadDivergenceScenario.pipelineRecord.serviceId,
          previousStatus: PipelineStatus.TESTING,
          newStatus: PipelineStatus.PUBLISHED,
          actorLabel: "DB Divergence Seeder",
          detail:
            "Development-only PostgreSQL divergence appended this publish event for hybrid read verification.",
          occurredAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
          createdAt: hybridReadDivergenceScenario.pipelineRecord.updatedAt,
        },
      });
    });

    console.info(
      "[eden-hybrid-read-divergence] Divergence applied. Set EDEN_BUILDER_LOOP_READ_MODE=hybrid and optionally EDEN_LOG_HYBRID_READS=true before verifying routes.",
    );
    console.info(
      "[eden-hybrid-read-divergence] Reset by re-running `npm run db:sync:canonical-marketplace`.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(args: string[]): DivergenceOptions | "help" {
  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }

  return {
    dryRun: args.includes("--dry-run"),
  };
}

function printUsage() {
  console.info("Usage: npm run db:diverge:hybrid-read -- [--dry-run]");
  console.info("");
  console.info(
    "Applies a reversible development-only PostgreSQL divergence for hybrid read verification.",
  );
  console.info(
    "Reset the database view back to canonical values with `npm run db:sync:canonical-marketplace`.",
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown hybrid-read divergence failure";

  console.error(`[eden-hybrid-read-divergence] ${message}`);
  process.exitCode = 1;
});
