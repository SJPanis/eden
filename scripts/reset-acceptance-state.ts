import { spawnSync } from "node:child_process";

async function main() {
  const args = process.argv.slice(2);
  const shouldReseed = args.includes("--with-seed");

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const prisma = getPrismaClient();

  try {
    await prisma.$transaction([
      prisma.paymentEventLog.deleteMany(),
      prisma.creditsTopUpPayment.deleteMany(),
      prisma.serviceUsage.deleteMany(),
      prisma.payoutSettlement.deleteMany(),
      prisma.internalLeavesUsage.deleteMany(),
      prisma.ownerLeavesGrant.deleteMany(),
      prisma.projectAgentRun.deleteMany(),
      prisma.projectAgent.deleteMany(),
      prisma.projectBlueprint.deleteMany(),
      prisma.pipelineEvent.deleteMany(),
      prisma.pipelineRecord.deleteMany(),
    ]);

    console.info(
      "[eden-acceptance-reset] Cleared mutable payment, usage, project, pipeline, and accounting state.",
    );
  } finally {
    await prisma.$disconnect();
  }

  if (!shouldReseed) {
    console.info(
      "[eden-acceptance-reset] Run `npm run acceptance:seed` next if you want canonical marketplace data restored.",
    );
    return;
  }

  const syncResult = spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "scripts/sync-canonical-marketplace.ts",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    },
  );

  if (syncResult.status !== 0) {
    throw new Error(
      "Canonical marketplace reseed failed after acceptance reset. Run `npm run acceptance:seed` manually.",
    );
  }

  console.info(
    "[eden-acceptance-reset] Canonical marketplace data restored after reset.",
  );
}

function printUsage() {
  console.info("Usage: npm run acceptance:reset -- [--with-seed]");
  console.info("");
  console.info(
    "Deletes mutable payment, usage, project, pipeline, and accounting records for local acceptance testing.",
  );
  console.info(
    "Pass --with-seed to immediately restore the canonical marketplace records afterward.",
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown acceptance reset failure";

  console.error(`[eden-acceptance-reset] ${message}`);
  process.exitCode = 1;
});
