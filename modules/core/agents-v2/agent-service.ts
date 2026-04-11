import "server-only";

import type { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  deductLeafs,
  grantLeafs,
} from "@/modules/core/economy/eden-economy-service";
import {
  resolveZoneForTaskKeywords,
  type ZoneId,
} from "@/modules/core/world/zones";

// Unity-facing agent service. See docs/PHASE_01_API_CONTRACT.md §8.
//
// Phase 01 is a state-machine STUB — agents spawn in the SPAWNING state and
// do not progress on their own. Real execution (walking, working,
// completing) comes in Phase 05 when a scheduler/worker advances the state
// machine. This service covers:
//
//   * spawnAgent: rate-limit check, qualification check, Leaf deduction,
//     initial row creation.
//   * listOwnAgents: plus limit + counter state for display.
//   * loadAgentDetail: owner gets full task detail + result; non-owners get
//     the public summary shape (spec §5.3 makes agents visible to all).
//   * terminateAgent: owner-only, prorated Leaf refund.

// ── Configuration ──────────────────────────────────────────────────────────

export const AGENT_LIMITS = {
  maxConcurrent: 3,
  maxPerHour: 10,
  maxPerDay: 50,
} as const;

export const AGENT_LEAF_COST = {
  artist: 25,
  architect: 15,
} as const;

const TASK_MIN_LENGTH = 10;
const TASK_MAX_LENGTH = 500;

// ── Types ──────────────────────────────────────────────────────────────────

export type AgentTypeLowercase = "artist" | "architect";
export type AgentStateLowercase =
  | "spawning"
  | "walking"
  | "working"
  | "completing"
  | "terminating"
  | "terminated";

export type AgentPublicShape = {
  id: string;
  type: AgentTypeLowercase;
  state: AgentStateLowercase;
  ownerId: string;
  ownerName: string;
  taskSummary: string;
  zoneTarget: ZoneId;
  position: { x: number; y: number };
  progress: number;
  leafCost: number;
  leafReward: number;
  prTag?: string | null;
  prUrl?: string | null;
  spawnedAt: string;
  completedAt?: string | null;
  terminatedAt?: string | null;
};

export type AgentSpawnResult =
  | {
      ok: true;
      agent: AgentPublicShape;
      balanceAfter: number;
    }
  | {
      ok: false;
      code:
        | "QUALIFICATION_FAILED"
        | "INSUFFICIENT_BALANCE"
        | "AGENT_LIMIT_REACHED"
        | "RATE_LIMITED";
      message: string;
      details?: Record<string, unknown>;
    };

// ── Spawn ──────────────────────────────────────────────────────────────────

export async function spawnAgent(input: {
  ownerId: string;
  ownerName: string;
  type: AgentTypeLowercase;
  task: string;
}): Promise<AgentSpawnResult> {
  const qualification = qualifyTask(input.task, input.type);
  if (!qualification.ok) {
    return {
      ok: false,
      code: "QUALIFICATION_FAILED",
      message: qualification.message,
    };
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [activeCount, hourlyCount, dailyCount] = await Promise.all([
    prisma.agent.count({
      where: { ownerId: input.ownerId, state: { not: "TERMINATED" } },
    }),
    prisma.agent.count({
      where: { ownerId: input.ownerId, spawnedAt: { gte: hourAgo } },
    }),
    prisma.agent.count({
      where: { ownerId: input.ownerId, spawnedAt: { gte: dayAgo } },
    }),
  ]);

  if (activeCount >= AGENT_LIMITS.maxConcurrent) {
    return {
      ok: false,
      code: "AGENT_LIMIT_REACHED",
      message: `Maximum concurrent agents reached (${AGENT_LIMITS.maxConcurrent}). Terminate one before spawning another.`,
      details: { limit: AGENT_LIMITS.maxConcurrent, current: activeCount, scope: "concurrent" },
    };
  }
  if (hourlyCount >= AGENT_LIMITS.maxPerHour) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: `Hourly agent spawn limit reached (${AGENT_LIMITS.maxPerHour}).`,
      details: {
        limit: AGENT_LIMITS.maxPerHour,
        current: hourlyCount,
        scope: "hourly",
        resetAt: new Date(hourAgo.getTime() + 60 * 60 * 1000).toISOString(),
      },
    };
  }
  if (dailyCount >= AGENT_LIMITS.maxPerDay) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: `Daily agent spawn limit reached (${AGENT_LIMITS.maxPerDay}).`,
      details: {
        limit: AGENT_LIMITS.maxPerDay,
        current: dailyCount,
        scope: "daily",
        resetAt: new Date(dayAgo.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  const leafCost = AGENT_LEAF_COST[input.type];
  const zoneTarget = resolveZoneForTaskKeywords(input.task, input.type);

  const deduction = await deductLeafs({
    userId: input.ownerId,
    leafsAmount: leafCost,
    description: `Agent spawn: ${input.type} — ${input.task.slice(0, 80)}`,
    metadata: {
      agentType: input.type,
      zoneTarget,
      taskPreview: input.task.slice(0, 200),
    },
  });

  if (!deduction.ok) {
    return {
      ok: false,
      code: "INSUFFICIENT_BALANCE",
      message: deduction.error,
    };
  }

  const agent = await prisma.agent.create({
    data: {
      type: input.type.toUpperCase() as "ARTIST" | "ARCHITECT",
      state: "SPAWNING",
      ownerId: input.ownerId,
      taskSummary: input.task,
      zoneTarget,
      position: { x: 0, y: 0 },
      progress: 0,
      leafCost,
      leafReward: 0,
    },
  });

  return {
    ok: true,
    agent: toPublicShape(agent, input.ownerName),
    balanceAfter: deduction.walletRecord.leafsBalance,
  };
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listOwnAgents(
  ownerId: string,
  filter: { states?: AgentStateLowercase[]; limit: number },
): Promise<{
  agents: AgentPublicShape[];
  activeCount: number;
  hourlyCount: number;
  dailyCount: number;
}> {
  const prisma = getPrismaClient();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const stateFilter = filter.states && filter.states.length > 0
    ? { in: filter.states.map((s) => s.toUpperCase()) as Array<Prisma.EnumAgentStateFilter["equals"]> }
    : undefined;

  const [rows, activeCount, hourlyCount, dailyCount, owner] = await Promise.all([
    prisma.agent.findMany({
      where: {
        ownerId,
        ...(stateFilter ? { state: { in: stateFilter.in as never } } : {}),
      },
      orderBy: { spawnedAt: "desc" },
      take: filter.limit,
    }),
    prisma.agent.count({
      where: { ownerId, state: { not: "TERMINATED" } },
    }),
    prisma.agent.count({
      where: { ownerId, spawnedAt: { gte: hourAgo } },
    }),
    prisma.agent.count({
      where: { ownerId, spawnedAt: { gte: dayAgo } },
    }),
    prisma.user.findUnique({
      where: { id: ownerId },
      select: { username: true },
    }),
  ]);

  const ownerName = owner?.username ?? "unknown";
  return {
    agents: rows.map((row) => toPublicShape(row, ownerName)),
    activeCount,
    hourlyCount,
    dailyCount,
  };
}

export async function loadAgentDetail(
  agentId: string,
  viewerUserId: string,
): Promise<
  | {
      found: true;
      isOwner: boolean;
      agent: AgentPublicShape;
      taskDetail: Prisma.JsonValue | null;
      result: Prisma.JsonValue | null;
    }
  | { found: false }
> {
  const prisma = getPrismaClient();
  const row = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { owner: { select: { username: true } } },
  });
  if (!row) return { found: false };

  const isOwner = row.ownerId === viewerUserId;
  return {
    found: true,
    isOwner,
    agent: toPublicShape(row, row.owner.username),
    taskDetail: isOwner ? row.taskDetail : null,
    result: isOwner ? row.result : null,
  };
}

// ── Terminate ──────────────────────────────────────────────────────────────

export type TerminateAgentResult =
  | {
      ok: true;
      agent: AgentPublicShape;
      refund: number;
      balanceAfter: number | null;
    }
  | {
      ok: false;
      code: "AGENT_NOT_FOUND" | "NOT_AGENT_OWNER" | "AGENT_ALREADY_TERMINATED";
      message: string;
    };

export async function terminateAgent(input: {
  agentId: string;
  actorUserId: string;
}): Promise<TerminateAgentResult> {
  const prisma = getPrismaClient();
  const row = await prisma.agent.findUnique({
    where: { id: input.agentId },
    include: { owner: { select: { username: true } } },
  });
  if (!row) {
    return { ok: false, code: "AGENT_NOT_FOUND", message: "Agent not found." };
  }
  if (row.ownerId !== input.actorUserId) {
    return {
      ok: false,
      code: "NOT_AGENT_OWNER",
      message: "Only the agent's owner can terminate it.",
    };
  }
  if (row.state === "TERMINATED" || row.state === "TERMINATING") {
    return {
      ok: false,
      code: "AGENT_ALREADY_TERMINATED",
      message: "Agent is already terminating or terminated.",
    };
  }

  const refundAmount = Math.round(row.leafCost * (1 - row.progress));

  const updated = await prisma.agent.update({
    where: { id: row.id },
    data: { state: "TERMINATING", terminatedAt: new Date() },
  });

  let balanceAfter: number | null = null;
  if (refundAmount > 0) {
    const grant = await grantLeafs({
      recipientUserId: row.ownerId,
      grantorUserId: row.ownerId,
      leafsAmount: refundAmount,
      description: `Agent termination refund: ${row.id} @ ${(row.progress * 100).toFixed(0)}% progress`,
    });
    balanceAfter = grant.walletRecord.leafsBalance;
  }

  return {
    ok: true,
    agent: toPublicShape(updated, row.owner.username),
    refund: refundAmount,
    balanceAfter,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function qualifyTask(
  task: string,
  _type: AgentTypeLowercase,
): { ok: true } | { ok: false; message: string } {
  const trimmed = task.trim();
  if (trimmed.length < TASK_MIN_LENGTH) {
    return {
      ok: false,
      message: `Task must be at least ${TASK_MIN_LENGTH} characters. Describe what you want the agent to do.`,
    };
  }
  if (trimmed.length > TASK_MAX_LENGTH) {
    return {
      ok: false,
      message: `Task must be at most ${TASK_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true };
}

type AgentRow = {
  id: string;
  type: "ARTIST" | "ARCHITECT";
  state:
    | "SPAWNING"
    | "WALKING"
    | "WORKING"
    | "COMPLETING"
    | "TERMINATING"
    | "TERMINATED";
  ownerId: string;
  taskSummary: string;
  zoneTarget: string;
  position: Prisma.JsonValue;
  progress: number;
  leafCost: number;
  leafReward: number;
  prTag: string | null;
  prUrl: string | null;
  spawnedAt: Date;
  completedAt: Date | null;
  terminatedAt: Date | null;
};

function toPublicShape(row: AgentRow, ownerName: string): AgentPublicShape {
  return {
    id: row.id,
    type: row.type.toLowerCase() as AgentTypeLowercase,
    state: row.state.toLowerCase() as AgentStateLowercase,
    ownerId: row.ownerId,
    ownerName,
    taskSummary: row.taskSummary,
    zoneTarget: (row.zoneTarget as ZoneId) ?? "tree",
    position: coercePosition(row.position),
    progress: row.progress,
    leafCost: row.leafCost,
    leafReward: row.leafReward,
    prTag: row.prTag,
    prUrl: row.prUrl,
    spawnedAt: row.spawnedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    terminatedAt: row.terminatedAt?.toISOString() ?? null,
  };
}

function coercePosition(raw: Prisma.JsonValue): { x: number; y: number } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { x: 0, y: 0 };
  const obj = raw as Record<string, unknown>;
  return {
    x: typeof obj.x === "number" ? obj.x : 0,
    y: typeof obj.y === "number" ? obj.y : 0,
  };
}
