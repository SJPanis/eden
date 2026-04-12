import { NextResponse } from "next/server";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import { ZONES, type ZoneId } from "@/modules/core/world/zones";
import { extractStoredAvatar, DEFAULT_AVATAR } from "@/modules/core/avatar/avatar-config";

// GET /api/world/state
// Contract: docs/PHASE_01_API_CONTRACT.md §4.1
//
// Full world snapshot. Unity calls this on connect and on WebSocket reconnect
// to reconcile. In Phase 01 the snapshot is mostly empty:
//
//   * players[] = active WorldSession rows joined with User. Zero today
//     because the WebSocket presence layer hasn't been wired yet — the
//     handshake doesn't create WorldSession rows as of the current session.
//   * agents[] = non-terminated Agent rows. Only populated once /api/agents
//     /spawn has actually been called.
//   * tree = static defaults; a real metrics-driven version lands in a later
//     phase when server-side aggregation exists.
//   * zones = canonical list from modules/core/world/zones.ts with
//     player/agent counts bucketed from the above.

export const runtime = "nodejs";

type AgentPosition = { x: number; y: number };

export async function GET(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  const prisma = getPrismaClient();

  const [presenceRows, agentRows] = await Promise.all([
    prisma.worldSession.findMany({
      where: { disconnectedAt: null },
      orderBy: { connectedAt: "desc" },
      take: 500,
      select: {
        id: true,
        userId: true,
        connectedAt: true,
        user: {
          select: {
            username: true,
            displayName: true,
            avatarConfig: true,
            lastPosition: true,
          },
        },
      },
    }),
    prisma.agent.findMany({
      where: { state: { not: "TERMINATED" } },
      orderBy: { spawnedAt: "desc" },
      take: 500,
      select: {
        id: true,
        type: true,
        state: true,
        ownerId: true,
        taskSummary: true,
        zoneTarget: true,
        position: true,
        progress: true,
        spawnedAt: true,
        owner: { select: { username: true } },
      },
    }),
  ]);

  // De-dupe presence by userId — one player entry per user even if they have
  // multiple active WorldSessions (e.g. desktop + laptop).
  const playersByUserId = new Map<string, ReturnType<typeof mapPresenceRow>>();
  for (const row of presenceRows) {
    if (playersByUserId.has(row.userId)) continue;
    playersByUserId.set(row.userId, mapPresenceRow(row));
  }

  const players = Array.from(playersByUserId.values());
  const agents = agentRows.map((row) => ({
    id: row.id,
    type: row.type.toLowerCase(),
    state: row.state.toLowerCase(),
    ownerId: row.ownerId,
    ownerName: row.owner.username,
    taskSummary: row.taskSummary,
    zoneTarget: row.zoneTarget,
    position: coercePosition(row.position),
    progress: row.progress,
    spawnedAt: row.spawnedAt.toISOString(),
  }));

  // Per-zone occupancy buckets.
  const zoneCounts = new Map<ZoneId, { playerCount: number; agentCount: number }>();
  for (const zone of ZONES) {
    zoneCounts.set(zone.id, { playerCount: 0, agentCount: 0 });
  }
  for (const player of players) {
    const zone = (player.zone ?? "tree") as ZoneId;
    const bucket = zoneCounts.get(zone);
    if (bucket) bucket.playerCount += 1;
  }
  for (const agent of agents) {
    const bucket = zoneCounts.get(agent.zoneTarget as ZoneId);
    if (bucket) bucket.agentCount += 1;
  }

  const zones = ZONES.map((zone) => ({
    id: zone.id,
    playerCount: zoneCounts.get(zone.id)?.playerCount ?? 0,
    agentCount: zoneCounts.get(zone.id)?.agentCount ?? 0,
    isActive: zone.isActive,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      players,
      agents,
      tree: {
        // Static defaults for Phase 01. A future phase drives these from
        // real system metrics (active agents, transaction rate, etc.) — see
        // spec §4.3 TreeReactivity.
        glowIntensity: Math.min(1, agents.length / 20),
        pulseRate: 0.5 + Math.min(1, agents.length / 20) * 1.5,
        canopyColor: [0.41, 0.94, 0.68] as [number, number, number],
        rootBrightness: 0.4,
        leafFallRate: 0,
        branchGrowth: 0,
        seedDrops: players.length,
      },
      zones,
      serverTime: new Date().toISOString(),
    },
  });
}

function mapPresenceRow(row: {
  userId: string;
  connectedAt: Date;
  user: {
    username: string;
    displayName: string;
    avatarConfig: unknown;
    lastPosition: unknown;
  };
}) {
  const lastPos = coerceLastPosition(row.user.lastPosition);
  return {
    id: row.userId,
    username: row.user.username,
    displayName: row.user.displayName,
    position: lastPos ? { x: lastPos.x, y: lastPos.y } : { x: 0, y: 0 },
    zone: lastPos?.zone ?? "tree",
    avatar: extractStoredAvatar(row.user.avatarConfig) ?? DEFAULT_AVATAR,
    isMoving: false,
    connectedAt: row.connectedAt.toISOString(),
  };
}

function coercePosition(raw: unknown): AgentPosition {
  if (!raw || typeof raw !== "object") return { x: 0, y: 0 };
  const obj = raw as Record<string, unknown>;
  const x = typeof obj.x === "number" ? obj.x : 0;
  const y = typeof obj.y === "number" ? obj.y : 0;
  return { x, y };
}

function coerceLastPosition(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.x !== "number" || typeof obj.y !== "number") return null;
  return {
    x: obj.x,
    y: obj.y,
    zone: typeof obj.zone === "string" ? obj.zone : null,
  };
}
