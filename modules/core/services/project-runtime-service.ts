import "server-only";

import { EdenRole, Prisma, UserStatus } from "@prisma/client";
import type {
  EdenProjectRuntimeRecord,
  EdenProjectRuntimeRegistryState,
} from "@/modules/core/projects/project-runtime-shared";
import {
  edenOwnerInternalSandboxBusinessId,
  edenOwnerInternalSandboxDomainLinkId,
  edenOwnerInternalSandboxProjectId,
  edenOwnerInternalSandboxRuntimeId,
} from "@/modules/core/projects/project-runtime-shared";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const projectRuntimeRegistryInclude = {
  creatorUser: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  project: {
    select: {
      id: true,
      title: true,
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  domainLinks: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.ProjectRuntimeInclude;

type ProjectRuntimeRegistryRecord = Prisma.ProjectRuntimeGetPayload<{
  include: typeof projectRuntimeRegistryInclude;
}>;

type EdenProjectRuntimeActor = {
  id: string;
  username: string;
  displayName: string;
  role: "consumer" | "business" | "owner";
  status: string;
  edenBalanceCredits?: number;
};

export async function loadOwnerProjectRuntimeRegistryState(): Promise<EdenProjectRuntimeRegistryState> {
  try {
    const prisma = getPrismaClient();
    const runtimes = await prisma.projectRuntime.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: projectRuntimeRegistryInclude,
    });

    return {
      runtimes: runtimes.map(mapProjectRuntimeRecord),
      unavailableReason: null,
    };
  } catch (error) {
    logProjectRuntimeFailure("load_owner_project_runtime_registry", error);

    return {
      runtimes: [],
      unavailableReason: describeProjectRuntimeFailure(error),
    };
  }
}

export async function registerOwnerInternalSandboxRuntime(
  actor: EdenProjectRuntimeActor,
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction) => {
    await upsertProjectRuntimeActor(transaction, actor);

    await transaction.business.upsert({
      where: {
        id: edenOwnerInternalSandboxBusinessId,
      },
      update: {
        ownerUserId: actor.id,
        name: "Eden Internal Sandbox",
        status: "TESTING",
        category: "Platform Development",
        tags: ["eden", "internal", "sandbox"],
        description:
          "Private internal workspace reserved for building and validating future Eden shell changes before they are promoted into Eden core.",
        summary:
          "Owner-only internal Eden workspace for sandboxed platform development metadata.",
        tagline: "Owner-only Eden sandbox workspace.",
        targetAudience: "Eden owner and future Eden release workflows",
        monetizationModel: "Not for sale",
        visibility: "INTERNAL_TESTING",
        teamLabel: "Eden Core Internal",
        nextMilestone: "Define isolated runtime provisioning and promotion flow.",
      },
      create: {
        id: edenOwnerInternalSandboxBusinessId,
        ownerUserId: actor.id,
        name: "Eden Internal Sandbox",
        status: "TESTING",
        category: "Platform Development",
        tags: ["eden", "internal", "sandbox"],
        description:
          "Private internal workspace reserved for building and validating future Eden shell changes before they are promoted into Eden core.",
        summary:
          "Owner-only internal Eden workspace for sandboxed platform development metadata.",
        tagline: "Owner-only Eden sandbox workspace.",
        targetAudience: "Eden owner and future Eden release workflows",
        monetizationModel: "Not for sale",
        visibility: "INTERNAL_TESTING",
        teamLabel: "Eden Core Internal",
        nextMilestone: "Define isolated runtime provisioning and promotion flow.",
      },
    });

    await transaction.businessMember.upsert({
      where: {
        businessId_userId: {
          businessId: edenOwnerInternalSandboxBusinessId,
          userId: actor.id,
        },
      },
      update: {
        role: "OWNER",
        title: "Eden Sandbox Owner",
      },
      create: {
        businessId: edenOwnerInternalSandboxBusinessId,
        userId: actor.id,
        role: "OWNER",
        title: "Eden Sandbox Owner",
      },
    });

    await transaction.projectBlueprint.upsert({
      where: {
        id: edenOwnerInternalSandboxProjectId,
      },
      update: {
        businessId: edenOwnerInternalSandboxBusinessId,
        creatorUserId: actor.id,
        title: "Eden Inside Eden Sandbox",
        description:
          "Private internal project blueprint for building, testing, and reviewing future Eden versions before they touch Eden core.",
        goal:
          "Represent the owner-only Eden sandbox as a controlled project/runtime pair inside the Eden platform shell without claiming real deployment before infrastructure exists.",
        status: "TESTING",
      },
      create: {
        id: edenOwnerInternalSandboxProjectId,
        businessId: edenOwnerInternalSandboxBusinessId,
        creatorUserId: actor.id,
        title: "Eden Inside Eden Sandbox",
        description:
          "Private internal project blueprint for building, testing, and reviewing future Eden versions before they touch Eden core.",
        goal:
          "Represent the owner-only Eden sandbox as a controlled project/runtime pair inside the Eden platform shell without claiming real deployment before infrastructure exists.",
        status: "TESTING",
      },
    });

    const existingRuntime = await transaction.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      select: {
        id: true,
      },
    });

    await transaction.projectRuntime.upsert({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      update: {
        projectId: edenOwnerInternalSandboxProjectId,
        creatorUserId: actor.id,
        name: "Eden Internal Sandbox Runtime",
        purpose:
          "Owner-only private runtime registry entry for future Eden development, staging, and release validation.",
        runtimeType: "INTERNAL_SANDBOX",
        environment: "DEVELOPMENT",
        target: "EDEN_INTERNAL",
        accessPolicy: "OWNER_ONLY",
        visibility: "PRIVATE_INTERNAL",
      },
      create: {
        id: edenOwnerInternalSandboxRuntimeId,
        projectId: edenOwnerInternalSandboxProjectId,
        creatorUserId: actor.id,
        name: "Eden Internal Sandbox Runtime",
        purpose:
          "Owner-only private runtime registry entry for future Eden development, staging, and release validation.",
        runtimeType: "INTERNAL_SANDBOX",
        environment: "DEVELOPMENT",
        target: "EDEN_INTERNAL",
        accessPolicy: "OWNER_ONLY",
        visibility: "PRIVATE_INTERNAL",
        status: "REGISTERED",
        runtimeLocator: "eden://internal-sandbox/development",
        statusDetail:
          "Metadata only. No isolated runtime has been provisioned yet.",
      },
    });

    await transaction.projectRuntimeDomainLink.upsert({
      where: {
        id: edenOwnerInternalSandboxDomainLinkId,
      },
      update: {
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        linkType: "INTERNAL_PREVIEW",
        hostname: "sandbox.eden.internal",
        pathPrefix: "/owner-sandbox",
        isPrimary: true,
      },
      create: {
        id: edenOwnerInternalSandboxDomainLinkId,
        runtimeId: edenOwnerInternalSandboxRuntimeId,
        linkType: "INTERNAL_PREVIEW",
        hostname: "sandbox.eden.internal",
        pathPrefix: "/owner-sandbox",
        isPrimary: true,
        isActive: false,
      },
    });

    const runtime = await transaction.projectRuntime.findUnique({
      where: {
        id: edenOwnerInternalSandboxRuntimeId,
      },
      include: projectRuntimeRegistryInclude,
    });

    if (!runtime) {
      throw new Error(
        "Eden could not load the internal sandbox runtime after registration.",
      );
    }

    return {
      created: !existingRuntime,
      runtime: mapProjectRuntimeRecord(runtime),
    };
  });
}

export function describeProjectRuntimeFailure(error: unknown) {
  if (isProjectRuntimeSchemaUnavailable(error)) {
    return "Project runtime tables are not available yet. Apply the latest Prisma migration before using the runtime registry.";
  }

  if (isProjectRuntimeDatabaseUnavailable(error)) {
    return "Project runtime registry could not reach Prisma cleanly. Verify database connectivity and permissions before using runtime control-plane features.";
  }

  return "Project runtime registry could not be loaded cleanly from Prisma. Review the server logs before relying on runtime control-plane data.";
}

function mapProjectRuntimeRecord(
  runtime: ProjectRuntimeRegistryRecord,
): EdenProjectRuntimeRecord {
  const previewLink = runtime.domainLinks.find(
    (link) => link.linkType === "INTERNAL_PREVIEW" && link.isActive,
  );
  const edenManagedLink = runtime.domainLinks.find(
    (link) => link.linkType === "EDEN_MANAGED" && link.isActive,
  );
  const externalLink = runtime.domainLinks.find(
    (link) => link.linkType === "LINKED_EXTERNAL" && link.isActive,
  );

  return {
    id: runtime.id,
    projectId: runtime.project.id,
    projectTitle: runtime.project.title,
    businessId: runtime.project.business.id,
    businessName: runtime.project.business.name,
    creatorUserId: runtime.creatorUserId,
    creatorLabel: `${runtime.creatorUser.displayName} (@${runtime.creatorUser.username})`,
    name: runtime.name,
    purpose: runtime.purpose,
    runtimeType: runtime.runtimeType.toLowerCase(),
    runtimeTypeLabel: formatEnumLabel(runtime.runtimeType),
    environment: runtime.environment.toLowerCase(),
    environmentLabel: formatEnumLabel(runtime.environment),
    target: runtime.target.toLowerCase(),
    targetLabel: formatEnumLabel(runtime.target),
    accessPolicy: runtime.accessPolicy.toLowerCase(),
    accessPolicyLabel: formatEnumLabel(runtime.accessPolicy),
    visibility: runtime.visibility.toLowerCase(),
    visibilityLabel: formatEnumLabel(runtime.visibility),
    status: runtime.status.toLowerCase(),
    statusLabel: formatEnumLabel(runtime.status),
    statusDetail: runtime.statusDetail,
    runtimeLocator: runtime.runtimeLocator,
    previewUrl: previewLink ? buildDomainLinkLabel(previewLink) : null,
    hostedUrl: edenManagedLink ? buildDomainLinkLabel(edenManagedLink) : null,
    linkedDomain: externalLink ? buildDomainLinkLabel(externalLink) : null,
    isOwnerOnly: runtime.accessPolicy === "OWNER_ONLY",
    isInternalOnly:
      runtime.target === "EDEN_INTERNAL" ||
      runtime.visibility === "PRIVATE_INTERNAL" ||
      runtime.runtimeType === "INTERNAL_SANDBOX" ||
      runtime.runtimeType === "INTERNAL_PREVIEW",
    createdAtLabel: formatTimestamp(runtime.createdAt),
    updatedAtLabel: formatTimestamp(runtime.updatedAt),
    lastHealthCheckAtLabel: runtime.lastHealthCheckAt
      ? formatTimestamp(runtime.lastHealthCheckAt)
      : null,
    domainLinks: runtime.domainLinks.map((link) => ({
      id: link.id,
      linkType: link.linkType.toLowerCase(),
      linkTypeLabel: formatEnumLabel(link.linkType),
      hostname: link.hostname,
      pathPrefix: link.pathPrefix,
      urlLabel: buildDomainLinkLabel(link),
      isPrimary: link.isPrimary,
      isActive: link.isActive,
    })),
  };
}

async function upsertProjectRuntimeActor(
  transaction: Prisma.TransactionClient,
  actor: EdenProjectRuntimeActor,
) {
  await transaction.user.upsert({
    where: {
      id: actor.id,
    },
    update: {
      username: actor.username,
      displayName: actor.displayName,
      role: toPrismaRole(actor.role),
      status: toPrismaUserStatus(actor.status),
      edenBalanceCredits: actor.edenBalanceCredits ?? 0,
    },
    create: {
      id: actor.id,
      username: actor.username,
      displayName: actor.displayName,
      role: toPrismaRole(actor.role),
      status: toPrismaUserStatus(actor.status),
      edenBalanceCredits: actor.edenBalanceCredits ?? 0,
    },
  });
}

function toPrismaRole(role: EdenProjectRuntimeActor["role"]) {
  if (role === "owner") {
    return EdenRole.OWNER;
  }

  if (role === "business") {
    return EdenRole.BUSINESS;
  }

  return EdenRole.CONSUMER;
}

function toPrismaUserStatus(status: string) {
  if (status === "review") {
    return UserStatus.REVIEW;
  }

  if (status === "frozen") {
    return UserStatus.FROZEN;
  }

  return UserStatus.ACTIVE;
}

function isProjectRuntimeSchemaUnavailable(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return true;
  }

  const message = getProjectRuntimeErrorMessage(error).toLowerCase();

  return (
    message.includes("projectruntime") ||
    message.includes("projectruntimedomainlink") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("does not exist"))
  );
}

function isProjectRuntimeDatabaseUnavailable(error: unknown) {
  const message = getProjectRuntimeErrorMessage(error).toLowerCase();

  return (
    message.includes("eacces") ||
    message.includes("permission denied") ||
    message.includes("database_url") ||
    message.includes("can't reach database server") ||
    message.includes("connection") ||
    message.includes("timed out")
  );
}

function getProjectRuntimeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown project runtime control-plane error";
}

function buildDomainLinkLabel(link: {
  hostname: string;
  pathPrefix: string | null;
}) {
  return `${link.hostname}${link.pathPrefix ?? ""}`;
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function logProjectRuntimeFailure(operation: string, error: unknown) {
  const message = getProjectRuntimeErrorMessage(error);

  console.warn(
    `[eden-project-runtime] Control-plane operation failed during ${operation}. ${message}`,
  );
}
