import { NextResponse } from "next/server";

import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import {
  listOwnAgents,
  AGENT_LIMITS,
  type AgentStateLowercase,
} from "@/modules/core/agents-v2/agent-service";

// GET /api/agents/mine
// Contract: docs/PHASE_01_API_CONTRACT.md §8.3
//
// Lists the authenticated user's agents (most recent first). Optional
// ?state=working,walking filter and ?limit=N (default 50, max 200).

export const runtime = "nodejs";

const VALID_STATES: AgentStateLowercase[] = [
  "spawning",
  "walking",
  "working",
  "completing",
  "terminating",
  "terminated",
];

export async function GET(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const stateParam = url.searchParams.get("state");
  const limitParam = url.searchParams.get("limit");

  const states = stateParam
    ? stateParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is AgentStateLowercase =>
          VALID_STATES.includes(s as AgentStateLowercase),
        )
    : undefined;

  const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam) || 50)) : 50;

  const result = await listOwnAgents(identity.userId, { states, limit });

  return NextResponse.json({
    ok: true,
    data: {
      agents: result.agents,
      activeCount: result.activeCount,
      hourlyCount: result.hourlyCount,
      dailyCount: result.dailyCount,
      limits: {
        maxConcurrent: AGENT_LIMITS.maxConcurrent,
        maxPerHour: AGENT_LIMITS.maxPerHour,
        maxPerDay: AGENT_LIMITS.maxPerDay,
      },
    },
  });
}
