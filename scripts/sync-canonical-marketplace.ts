import {
  BusinessMemberRole,
  BusinessStatus,
  BusinessVisibility,
  EdenRole,
  PipelineStatus,
  Prisma,
  UserStatus,
} from "@prisma/client";

type SyncOptions = {
  dryRun: boolean;
};

type CanonicalMarketplaceData = {
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    role: "consumer" | "business" | "owner";
    status: "active" | "review" | "frozen";
    summary: string;
    edenBalanceCredits: number;
  }>;
  businesses: Array<{
    id: string;
    ownerUserId: string;
    name: string;
    status: "draft" | "testing" | "published";
    category: string;
    tags: string[];
    description: string;
    summary: string;
    tagline: string;
    visibility: "Private preview" | "Internal testing" | "Published";
    teamLabel: string;
    creditBalanceCredits: number;
    publishReadinessPercent: number;
    nextMilestone: string;
    featuredServiceId: string;
  }>;
  services: Array<{
    id: string;
    title: string;
    businessId: string;
    category: string;
    description: string;
    summary: string;
    status: string;
    tags: string[];
  }>;
};

type CanonicalSyncPayload = {
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    role: EdenRole;
    status: UserStatus;
    summary: string;
    edenBalanceCredits: number;
  }>;
  authProviderAccounts: Array<{
    provider: string;
    providerSubject: string;
    userId: string;
  }>;
  businesses: Array<{
    id: string;
    ownerUserId: string;
    name: string;
    status: BusinessStatus;
    category: string;
    tags: string[];
    description: string;
    summary: string;
    tagline: string;
    targetAudience: string | null;
    monetizationModel: string | null;
    visibility: BusinessVisibility;
    teamLabel: string;
    creditBalanceCredits: number;
    publishReadinessPercent: number;
    nextMilestone: string;
    featuredServiceId: string;
  }>;
  memberships: Array<{
    businessId: string;
    userId: string;
    role: BusinessMemberRole;
    title: string;
  }>;
  services: Array<{
    id: string;
    businessId: string;
    title: string;
    category: string;
    tags: string[];
    description: string;
    summary: string;
    status: PipelineStatus;
    pricingModel: string | null;
    automationSummary: string | null;
    publishedAt: Date | null;
  }>;
  pipelineRecords: Array<{
    businessId: string;
    serviceId: string;
    status: PipelineStatus;
    buildStarted: boolean;
    lastActionLabel: string;
    updatedAt: Date;
  }>;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options === "help") {
    printUsage();
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Canonical marketplace sync is development-only. Refusing to run while NODE_ENV=production.",
    );
  }

  const marketplaceData = await loadCanonicalMarketplaceData();
  const payload = buildCanonicalSyncPayload(marketplaceData);

  console.info(
    `[eden-canonical-sync] Prepared ${payload.users.length} users, ${payload.authProviderAccounts.length} provider accounts, ${payload.businesses.length} businesses, ${payload.memberships.length} memberships, ${payload.services.length} services, and ${payload.pipelineRecords.length} pipeline records.`,
  );

  if (options.dryRun) {
    console.info(
      "[eden-canonical-sync] Dry run only. No database changes were made.",
    );
    return;
  }

  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const prisma = getPrismaClient();

  try {
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      for (const user of payload.users) {
        await transaction.user.upsert({
          where: {
            id: user.id,
          },
          update: {
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            summary: user.summary,
            edenBalanceCredits: user.edenBalanceCredits,
          },
          create: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            summary: user.summary,
            edenBalanceCredits: user.edenBalanceCredits,
          },
        });
      }

      for (const providerAccount of payload.authProviderAccounts) {
        await transaction.authProviderAccount.upsert({
          where: {
            provider_providerSubject: {
              provider: providerAccount.provider,
              providerSubject: providerAccount.providerSubject,
            },
          },
          update: {
            userId: providerAccount.userId,
          },
          create: {
            provider: providerAccount.provider,
            providerSubject: providerAccount.providerSubject,
            userId: providerAccount.userId,
          },
        });
      }

      for (const business of payload.businesses) {
        await transaction.business.upsert({
          where: {
            id: business.id,
          },
          update: {
            ownerUserId: business.ownerUserId,
            name: business.name,
            status: business.status,
            category: business.category,
            tags: business.tags,
            description: business.description,
            summary: business.summary,
            tagline: business.tagline,
            targetAudience: business.targetAudience,
            monetizationModel: business.monetizationModel,
            visibility: business.visibility,
            teamLabel: business.teamLabel,
            creditBalanceCredits: business.creditBalanceCredits,
            publishReadinessPercent: business.publishReadinessPercent,
            nextMilestone: business.nextMilestone,
          },
          create: {
            id: business.id,
            ownerUserId: business.ownerUserId,
            name: business.name,
            status: business.status,
            category: business.category,
            tags: business.tags,
            description: business.description,
            summary: business.summary,
            tagline: business.tagline,
            targetAudience: business.targetAudience,
            monetizationModel: business.monetizationModel,
            visibility: business.visibility,
            teamLabel: business.teamLabel,
            creditBalanceCredits: business.creditBalanceCredits,
            publishReadinessPercent: business.publishReadinessPercent,
            nextMilestone: business.nextMilestone,
          },
        });
      }

      for (const membership of payload.memberships) {
        await transaction.businessMember.upsert({
          where: {
            businessId_userId: {
              businessId: membership.businessId,
              userId: membership.userId,
            },
          },
          update: {
            role: membership.role,
            title: membership.title,
          },
          create: {
            businessId: membership.businessId,
            userId: membership.userId,
            role: membership.role,
            title: membership.title,
          },
        });
      }

      for (const service of payload.services) {
        await transaction.service.upsert({
          where: {
            id: service.id,
          },
          update: {
            businessId: service.businessId,
            title: service.title,
            category: service.category,
            tags: service.tags,
            description: service.description,
            summary: service.summary,
            status: service.status,
            pricingModel: service.pricingModel,
            automationSummary: service.automationSummary,
            publishedAt: service.publishedAt,
          },
          create: {
            id: service.id,
            businessId: service.businessId,
            title: service.title,
            category: service.category,
            tags: service.tags,
            description: service.description,
            summary: service.summary,
            status: service.status,
            pricingModel: service.pricingModel,
            automationSummary: service.automationSummary,
            publishedAt: service.publishedAt,
          },
        });
      }

      for (const business of payload.businesses) {
        await transaction.business.update({
          where: {
            id: business.id,
          },
          data: {
            featuredServiceId: business.featuredServiceId,
          },
        });
      }

      for (const record of payload.pipelineRecords) {
        await transaction.pipelineRecord.upsert({
          where: {
            businessId_serviceId: {
              businessId: record.businessId,
              serviceId: record.serviceId,
            },
          },
          update: {
            status: record.status,
            buildStarted: record.buildStarted,
            lastActionLabel: record.lastActionLabel,
            updatedAt: record.updatedAt,
          },
          create: {
            businessId: record.businessId,
            serviceId: record.serviceId,
            status: record.status,
            buildStarted: record.buildStarted,
            lastActionLabel: record.lastActionLabel,
            createdAt: record.updatedAt,
            updatedAt: record.updatedAt,
          },
        });
      }
    });

    console.info(
      "[eden-canonical-sync] Canonical marketplace records synced to PostgreSQL.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(args: string[]): SyncOptions | "help" {
  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }

  return {
    dryRun: args.includes("--dry-run"),
  };
}

function printUsage() {
  console.info("Usage: npm run db:sync:canonical-marketplace -- [--dry-run]");
  console.info("");
  console.info("Syncs Eden's canonical mock marketplace records into PostgreSQL.");
  console.info("This is development-only and uses idempotent upserts.");
}

function buildCanonicalSyncPayload(
  marketplaceData: CanonicalMarketplaceData,
): CanonicalSyncPayload {
  return {
    users: marketplaceData.users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: toPrismaRole(user.role),
      status: toPrismaUserStatus(user.status),
      summary: user.summary,
      edenBalanceCredits: user.edenBalanceCredits,
    })),
    authProviderAccounts: marketplaceData.users.map((user) => ({
      provider: "eden-dev-session-switcher",
      providerSubject: `eden-dev:${user.username}`,
      userId: user.id,
    })),
    businesses: marketplaceData.businesses.map((business) => ({
      id: business.id,
      ownerUserId: business.ownerUserId,
      name: business.name,
      status: toPrismaBusinessStatus(business.status),
      category: business.category,
      tags: business.tags,
      description: business.description,
      summary: business.summary,
      tagline: business.tagline,
      targetAudience: null,
      monetizationModel: null,
      visibility: toPrismaBusinessVisibility(business.visibility),
      teamLabel: business.teamLabel,
      creditBalanceCredits: business.creditBalanceCredits,
      publishReadinessPercent: business.publishReadinessPercent,
      nextMilestone: business.nextMilestone,
      featuredServiceId: resolveFeaturedServiceId(
        marketplaceData.services,
        business.id,
        business.featuredServiceId,
      ),
    })),
    memberships: marketplaceData.businesses.map((business) => ({
      businessId: business.id,
      userId: business.ownerUserId,
      role: BusinessMemberRole.OWNER,
      title: "Workspace Owner",
    })),
    services: marketplaceData.services.map((service, index) => {
      const status = normalizeServiceStatus(service.status);

      return {
        id: service.id,
        businessId: service.businessId,
        title: service.title,
        category: service.category,
        tags: service.tags,
        description: service.description,
        summary: service.summary,
        status,
        pricingModel: null,
        automationSummary: null,
        publishedAt:
          status === PipelineStatus.PUBLISHED
            ? buildStableTimestamp(index + 1, 15)
            : null,
      };
    }),
    pipelineRecords: marketplaceData.services.map((service, index) => {
      const status = normalizeServiceStatus(service.status);

      return {
        businessId: service.businessId,
        serviceId: service.id,
        status,
        buildStarted: status !== PipelineStatus.DRAFT,
        lastActionLabel: getPipelineLabelForStatus(status),
        updatedAt: buildStableTimestamp(index + 1, 17),
      };
    }),
  };
}

function buildStableTimestamp(dayOffset: number, hourUtc: number) {
  return new Date(Date.UTC(2026, 2, dayOffset, hourUtc, 0, 0));
}

function normalizeServiceStatus(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("publish")) {
    return PipelineStatus.PUBLISHED;
  }

  if (normalized.includes("ready")) {
    return PipelineStatus.READY;
  }

  if (normalized.includes("testing")) {
    return PipelineStatus.TESTING;
  }

  return PipelineStatus.DRAFT;
}

function resolveFeaturedServiceId(
  serviceCatalog: CanonicalMarketplaceData["services"],
  businessId: string,
  featuredServiceId: string,
) {
  if (featuredServiceId) {
    return featuredServiceId;
  }

  const fallbackServiceId = serviceCatalog.find((service) => service.businessId === businessId)?.id;

  if (!fallbackServiceId) {
    throw new Error(
      `Canonical marketplace sync could not resolve a featured service for business ${businessId}.`,
    );
  }

  return fallbackServiceId;
}

async function loadCanonicalMarketplaceData(): Promise<CanonicalMarketplaceData> {
  const platformDataModule = await import(
    new URL("../modules/core/mock-data/platform-data.ts", import.meta.url).href
  );

  return {
    users: platformDataModule.users as CanonicalMarketplaceData["users"],
    businesses: platformDataModule.businesses as CanonicalMarketplaceData["businesses"],
    services: platformDataModule.services as CanonicalMarketplaceData["services"],
  };
}

function getPipelineLabelForStatus(status: PipelineStatus) {
  if (status === PipelineStatus.PUBLISHED) {
    return "Canonical marketplace sync marked this service as published for hybrid discovery testing.";
  }

  if (status === PipelineStatus.READY) {
    return "Canonical marketplace sync marked this service as ready for publish-prep testing.";
  }

  if (status === PipelineStatus.TESTING) {
    return "Canonical marketplace sync marked this service as testing for hybrid builder loop validation.";
  }

  return "Canonical marketplace sync staged this service as a draft builder record.";
}

function toPrismaRole(role: "consumer" | "business" | "owner") {
  if (role === "owner") {
    return EdenRole.OWNER;
  }

  if (role === "business") {
    return EdenRole.BUSINESS;
  }

  return EdenRole.CONSUMER;
}

function toPrismaUserStatus(status: "active" | "review" | "frozen") {
  if (status === "review") {
    return UserStatus.REVIEW;
  }

  if (status === "frozen") {
    return UserStatus.FROZEN;
  }

  return UserStatus.ACTIVE;
}

function toPrismaBusinessStatus(status: "draft" | "testing" | "published") {
  if (status === "published") {
    return BusinessStatus.PUBLISHED;
  }

  if (status === "testing") {
    return BusinessStatus.TESTING;
  }

  return BusinessStatus.DRAFT;
}

function toPrismaBusinessVisibility(
  visibility: "Private preview" | "Internal testing" | "Published",
) {
  if (visibility === "Published") {
    return BusinessVisibility.PUBLISHED;
  }

  if (visibility === "Internal testing") {
    return BusinessVisibility.INTERNAL_TESTING;
  }

  return BusinessVisibility.PRIVATE_PREVIEW;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown sync failure";

  if (message.includes("does not exist")) {
    console.error(
      "[eden-canonical-sync] Database tables are missing. Run `npx prisma db push` before syncing canonical records.",
    );
  }

  console.error(`[eden-canonical-sync] ${message}`);
  process.exitCode = 1;
});
