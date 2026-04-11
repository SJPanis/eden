import { NextResponse } from "next/server";

import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import {
  spawnAgent,
  type AgentTypeLowercase,
} from "@/modules/core/agents-v2/agent-service";

// POST /api/agents/spawn
// Contract: docs/PHASE_01_API_CONTRACT.md §8.2
//
// Replaces the legacy stub that returned { id: Date.now() } — this is the
// real Unity-facing spawn path. State-machine stub: the agent starts in
// SPAWNING and does not progress on its own until Phase 05 wires a scheduler.

export const runtime = "nodejs";

type SpawnBody = {
  type?: unknown;
  task?: unknown;
};

export async function POST(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  let body: SpawnBody;
  try {
    body = (await request.json()) as SpawnBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const typeRaw = typeof body.type === "string" ? body.type.toLowerCase() : null;
  const task = typeof body.task === "string" ? body.task : null;
  if (typeRaw !== "artist" && typeRaw !== "architect") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "type must be 'artist' or 'architect'.",
        },
      },
      { status: 400 },
    );
  }
  if (!task) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "task is required." } },
      { status: 400 },
    );
  }

  const result = await spawnAgent({
    ownerId: identity.userId,
    ownerName: identity.username,
    type: typeRaw as AgentTypeLowercase,
    task,
  });

  if (!result.ok) {
    const status =
      result.code === "INSUFFICIENT_BALANCE"
        ? 402
        : result.code === "QUALIFICATION_FAILED"
          ? 422
          : 429; // AGENT_LIMIT_REACHED or RATE_LIMITED
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: result.code,
          message: result.message,
          ...("details" in result && result.details ? { details: result.details } : {}),
        },
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        agent: result.agent,
        balanceAfter: result.balanceAfter,
      },
    },
    { status: 201 },
  );
}
