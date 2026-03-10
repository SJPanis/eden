import "server-only";

import {
  edenProjectHostingLeavesPerDay,
  type EdenProjectBlueprintRecord,
  type EdenProjectBlueprintStatus,
} from "@/modules/core/projects/project-blueprint-shared";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

export async function loadBusinessProjectBlueprints(businessId: string) {
  const prisma = getPrismaClient();
  const projects = await prisma.projectBlueprint.findMany({
    where: {
      businessId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return projects.map((project) => mapProjectBlueprintRecord(project));
}

export async function createProjectBlueprint(input: {
  businessId: string;
  creatorUserId: string;
  title: string;
  description: string;
  goal: string;
}) {
  const prisma = getPrismaClient();
  const record = await prisma.projectBlueprint.create({
    data: {
      businessId: input.businessId,
      creatorUserId: input.creatorUserId,
      title: input.title,
      description: input.description,
      goal: input.goal,
      status: "DRAFT",
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return mapProjectBlueprintRecord(record);
}

export async function createProjectAgent(input: {
  projectId: string;
  name: string;
  roleTitle: string;
  instructions: string;
  parentAgentId?: string | null;
  branchLabel?: string | null;
}) {
  const prisma = getPrismaClient();
  return prisma.projectAgent.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      roleTitle: input.roleTitle,
      instructions: input.instructions,
      parentAgentId: input.parentAgentId ?? null,
      branchLabel: input.branchLabel ?? null,
    },
    select: {
      id: true,
      name: true,
      roleTitle: true,
      instructions: true,
      parentAgentId: true,
      branchLabel: true,
      createdAt: true,
    },
  });
}

export async function loadProjectBlueprintById(projectId: string) {
  const prisma = getPrismaClient();
  const project = await prisma.projectBlueprint.findUnique({
    where: {
      id: projectId,
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return project ? mapProjectBlueprintRecord(project) : null;
}

export async function markProjectBlueprintTesting(projectId: string) {
  const prisma = getPrismaClient();
  const project = await prisma.projectBlueprint.update({
    where: {
      id: projectId,
    },
    data: {
      status: "TESTING",
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return mapProjectBlueprintRecord(project);
}

export async function publishProjectBlueprint(projectId: string) {
  const prisma = getPrismaClient();
  const existingProject = await prisma.projectBlueprint.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!existingProject) {
    return null;
  }

  const remainingLeaves = calculateRemainingHostingLeaves(
    existingProject.hostingBalanceLeaves,
    existingProject.hostingBalanceUpdatedAt,
  );

  if (remainingLeaves <= 0) {
    return {
      ok: false as const,
      error: "Fund hosting with earned Leaves before publishing this project.",
    };
  }

  const project = await prisma.projectBlueprint.update({
    where: {
      id: projectId,
    },
    data: {
      status: "PUBLISHED",
      publishedAt: existingProject.publishedAt ?? new Date(),
      hostingBalanceLeaves: remainingLeaves,
      hostingBalanceUpdatedAt: new Date(),
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return {
    ok: true as const,
    project: mapProjectBlueprintRecord(project),
  };
}

export async function fundProjectHosting(input: {
  projectId: string;
  amountLeaves: number;
}) {
  const prisma = getPrismaClient();
  const existingProject = await prisma.projectBlueprint.findUnique({
    where: {
      id: input.projectId,
    },
  });

  if (!existingProject) {
    return null;
  }

  const remainingLeaves = calculateRemainingHostingLeaves(
    existingProject.hostingBalanceLeaves,
    existingProject.hostingBalanceUpdatedAt,
  );
  const nextLeavesBalance = remainingLeaves + input.amountLeaves;
  const nextStatus =
    existingProject.publishedAt && nextLeavesBalance > 0
      ? "PUBLISHED"
      : existingProject.status;

  const project = await prisma.projectBlueprint.update({
    where: {
      id: input.projectId,
    },
    data: {
      hostingBalanceLeaves: nextLeavesBalance,
      hostingBalanceUpdatedAt: new Date(),
      status: nextStatus,
    },
    include: {
      creatorUser: {
        select: {
          username: true,
          displayName: true,
        },
      },
      agents: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return mapProjectBlueprintRecord(project);
}

export async function runProjectBlueprintTest(input: {
  projectId: string;
  prompt: string;
}) {
  const project = await loadProjectBlueprintById(input.projectId);

  if (!project) {
    return null;
  }

  const teamSummary =
    project.agents.length > 0
      ? project.agents
          .map((agent) => `${agent.name} (${agent.roleTitle})`)
          .slice(0, 4)
          .join(", ")
      : "No named agents yet";
  const previewSteps = [
    `Goal: ${project.goal}`,
    `Prompt: ${input.prompt}`,
    `Team: ${teamSummary}`,
    project.hostingRemainingLeaves > 0
      ? `Hosting bank: ${project.hostingRemainingLeaves} Leaves remain available for launch.`
      : "Hosting bank: fund hosting before going live.",
    project.isPublished
      ? "Publish state: ready for a consumer-facing launch snapshot."
      : "Publish state: still inside the builder test loop.",
  ];

  return {
    projectId: project.id,
    outputTitle: `${project.title} test run`,
    outputSummary: `Eden simulated a controlled test pass for ${project.title.toLowerCase()}.`,
    outputLines: previewSteps,
  };
}

export function calculateRemainingHostingLeaves(
  hostingBalanceLeaves: number,
  hostingBalanceUpdatedAt?: Date | null,
) {
  if (!hostingBalanceUpdatedAt || hostingBalanceLeaves <= 0) {
    return Math.max(hostingBalanceLeaves, 0);
  }

  const elapsedMs = Date.now() - hostingBalanceUpdatedAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const consumedLeaves = elapsedDays * edenProjectHostingLeavesPerDay;

  return Math.max(hostingBalanceLeaves - consumedLeaves, 0);
}

function mapProjectBlueprintRecord(project: {
  id: string;
  businessId: string;
  creatorUserId: string;
  title: string;
  description: string;
  goal: string;
  status: "DRAFT" | "TESTING" | "PUBLISHED" | "INACTIVE";
  hostingBalanceLeaves: number;
  hostingBalanceUpdatedAt: Date | null;
  publishedAt: Date | null;
  creatorUser: {
    username: string;
    displayName: string;
  };
  agents: Array<{
    id: string;
    name: string;
    roleTitle: string;
    instructions: string;
    parentAgentId: string | null;
    branchLabel: string | null;
    createdAt: Date;
  }>;
}) {
  const hostingRemainingLeaves = calculateRemainingHostingLeaves(
    project.hostingBalanceLeaves,
    project.hostingBalanceUpdatedAt,
  );
  const isPublished = project.status === "PUBLISHED" || Boolean(project.publishedAt);
  const isActive = isPublished && hostingRemainingLeaves > 0;
  const effectiveStatus: EdenProjectBlueprintStatus = isActive
    ? "published"
    : isPublished
      ? "inactive"
      : project.status.toLowerCase() as EdenProjectBlueprintStatus;

  return {
    id: project.id,
    businessId: project.businessId,
    creatorUserId: project.creatorUserId,
    creatorLabel: `${project.creatorUser.displayName} (@${project.creatorUser.username})`,
    title: project.title,
    description: project.description,
    goal: project.goal,
    status: effectiveStatus,
    storedStatus: project.status.toLowerCase() as EdenProjectBlueprintStatus,
    isPublished,
    isActive,
    publishedAtLabel: project.publishedAt ? formatTimestamp(project.publishedAt) : null,
    hostingBalanceLeaves: project.hostingBalanceLeaves,
    hostingRemainingLeaves,
    hostingDaysRemaining:
      hostingRemainingLeaves > 0
        ? Math.ceil(hostingRemainingLeaves / edenProjectHostingLeavesPerDay)
        : 0,
    hostingFundedAtLabel: project.hostingBalanceUpdatedAt
      ? formatTimestamp(project.hostingBalanceUpdatedAt)
      : null,
    agents: project.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      roleTitle: agent.roleTitle,
      instructions: agent.instructions,
      parentAgentId: agent.parentAgentId,
      branchLabel: agent.branchLabel,
      createdAtLabel: formatTimestamp(agent.createdAt),
    })),
  } satisfies EdenProjectBlueprintRecord;
}

function formatTimestamp(timestamp: Date) {
  return timestamp.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
