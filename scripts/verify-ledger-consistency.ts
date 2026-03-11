import { Prisma } from "@prisma/client";

type SettledPaymentRow = {
  id: string;
  providerSessionId: string;
  userId: string | null;
  creditsAmount: number;
  amountCents: number;
  settledAt: Date | null;
};

type MeteredServiceUsageRow = {
  id: string;
  executionKey: string | null;
  usageType: string;
  creditsUsed: number;
  grossCredits: number | null;
  platformFeeCredits: number | null;
  builderEarningsCredits: number | null;
};

type ProjectAgentRunRow = {
  id: string;
  projectId: string;
  agentId: string;
  executionKey: string | null;
  costLeaves: number;
};

type InternalLeavesUsageRow = {
  id: string;
  businessId: string;
  amountCredits: number;
  reference: string | null;
};

async function main() {
  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const prisma = getPrismaClient();

  try {
    const warnings: string[] = [];
    const settledPayments =
      (await safeQuery<SettledPaymentRow[]>(
        () =>
          prisma.creditsTopUpPayment.findMany({
            where: {
              status: "SETTLED",
            },
            select: {
              id: true,
              providerSessionId: true,
              userId: true,
              creditsAmount: true,
              amountCents: true,
              settledAt: true,
            },
          }),
        "CreditsTopUpPayment",
        warnings,
      )) ?? [];
    const serviceUsages =
      (await safeQuery<MeteredServiceUsageRow[]>(
        () =>
          prisma.serviceUsage.findMany({
            where: {
              usageType: {
                in: ["simulate_service_usage", "live_service_execution"],
              },
            },
            select: {
              id: true,
              executionKey: true,
              usageType: true,
              creditsUsed: true,
              grossCredits: true,
              platformFeeCredits: true,
              builderEarningsCredits: true,
            },
          }),
        "ServiceUsage",
        warnings,
      )) ?? [];
    const projectAgentRuns =
      (await safeQuery<ProjectAgentRunRow[]>(
        () =>
          prisma.projectAgentRun.findMany({
            select: {
              id: true,
              projectId: true,
              agentId: true,
              executionKey: true,
              costLeaves: true,
            },
          }),
        "ProjectAgentRun",
        warnings,
      )) ?? [];
    const internalLeavesUsages =
      (await safeQuery<InternalLeavesUsageRow[]>(
        () =>
          prisma.internalLeavesUsage.findMany({
            where: {
              usageType: "project_agent_run",
            },
            select: {
              id: true,
              businessId: true,
              amountCredits: true,
              reference: true,
            },
          }),
        "InternalLeavesUsage",
        warnings,
      )) ?? [];
    const issues: string[] = [];

    for (const payment of settledPayments) {
      if (!payment.settledAt) {
        issues.push(`Settled payment ${payment.id} is missing settledAt.`);
      }
      if (payment.creditsAmount <= 0 || payment.amountCents <= 0) {
        issues.push(
          `Settled payment ${payment.id} has a non-positive amount (${payment.creditsAmount} Leaves / ${payment.amountCents} cents).`,
        );
      }
    }

    const seenServiceExecutionKeys = new Set<string>();
    for (const usage of serviceUsages) {
      if (usage.creditsUsed <= 0) {
        issues.push(`Service usage ${usage.id} has a non-positive debit.`);
      }
      if (
        usage.grossCredits == null ||
        usage.platformFeeCredits == null ||
        usage.builderEarningsCredits == null
      ) {
        issues.push(
          `Service usage ${usage.id} is missing stored economics (gross/platform fee/builder earnings).`,
        );
      } else if (
        usage.grossCredits !==
        usage.platformFeeCredits + usage.builderEarningsCredits
      ) {
        issues.push(
          `Service usage ${usage.id} has inconsistent economics: gross ${usage.grossCredits} != fee ${usage.platformFeeCredits} + builder ${usage.builderEarningsCredits}.`,
        );
      }

      if (usage.executionKey) {
        if (seenServiceExecutionKeys.has(usage.executionKey)) {
          issues.push(`Duplicate service execution key detected: ${usage.executionKey}.`);
        }
        seenServiceExecutionKeys.add(usage.executionKey);
      }
    }

    const internalUsageByReference = new Map<
      string,
      InternalLeavesUsageRow
    >(
      internalLeavesUsages.map((record) => [record.reference ?? "", record]),
    );
    const seenProjectRunExecutionKeys = new Set<string>();

    for (const run of projectAgentRuns) {
      if (!run.executionKey) {
        issues.push(`Project agent run ${run.id} is missing executionKey.`);
        continue;
      }

      if (seenProjectRunExecutionKeys.has(run.executionKey)) {
        issues.push(`Duplicate project agent execution key detected: ${run.executionKey}.`);
      }
      seenProjectRunExecutionKeys.add(run.executionKey);

      if (run.costLeaves <= 0) {
        issues.push(`Project agent run ${run.id} has a non-positive Leaves cost.`);
      }

      const expectedReference = `project-agent-run-${run.projectId}-${run.agentId}-${run.executionKey}`;
      const matchingInternalUsage = internalUsageByReference.get(expectedReference);

      if (!matchingInternalUsage) {
        issues.push(
          `Project agent run ${run.id} is missing its matching internal Leaves usage record.`,
        );
        continue;
      }

      if (matchingInternalUsage.amountCredits !== run.costLeaves) {
        issues.push(
          `Project agent run ${run.id} cost ${run.costLeaves} does not match internal Leaves usage ${matchingInternalUsage.amountCredits}.`,
        );
      }
    }

    console.info(
      `[eden-ledger-verify] settled payments=${settledPayments.length}, metered service usages=${serviceUsages.length}, project agent runs=${projectAgentRuns.length}, project agent internal-usage rows=${internalLeavesUsages.length}`,
    );

    for (const warning of warnings) {
      console.warn(`[eden-ledger-verify] warning: ${warning}`);
    }

    if (issues.length === 0) {
      console.info("[eden-ledger-verify] Ledger consistency checks passed.");
      return;
    }

    console.error("[eden-ledger-verify] Ledger consistency checks failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function safeQuery<T>(
  run: () => Promise<T>,
  label: string,
  warnings: string[],
) {
  try {
    return await run();
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.code}${error.meta ? ` ${JSON.stringify(error.meta)}` : ""}`
        : error instanceof Error
          ? error.message
          : "unknown query failure";
    warnings.push(`${label} check skipped: ${message}`);
    return null;
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `${error.code}${error.meta ? ` ${JSON.stringify(error.meta)}` : ""}`
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.message
        : error instanceof Error
          ? error.stack ?? error.message
          : "Unknown ledger verification failure";

  console.error(`[eden-ledger-verify] ${message}`);
  process.exitCode = 1;
});
