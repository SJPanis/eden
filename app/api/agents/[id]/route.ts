import { NextResponse } from "next/server";

import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import {
  loadAgentDetail,
  terminateAgent,
} from "@/modules/core/agents-v2/agent-service";

// GET/DELETE /api/agents/[id]
// Contract: docs/PHASE_01_API_CONTRACT.md §8.4 / §8.5
//
// Dynamic segment intentionally positioned so that static sibling routes
// (spawn, mine, orchestrate, execute, status, history, adam, architect, eve,
// commit, trigger, loop-status) take precedence per Next.js App Router
// matching rules. /api/agents/mine reaches app/api/agents/mine/route.ts, not
// this file.

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) return unauthorized();

  const { id } = await context.params;
  const detail = await loadAgentDetail(id, identity.userId);
  if (!detail.found) {
    return NextResponse.json(
      { ok: false, error: { code: "AGENT_NOT_FOUND", message: "Agent not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      agent: detail.agent,
      ...(detail.isOwner
        ? {
            taskDetail: detail.taskDetail,
            result: detail.result,
          }
        : {}),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) return unauthorized();

  const { id } = await context.params;
  const result = await terminateAgent({
    agentId: id,
    actorUserId: identity.userId,
  });

  if (!result.ok) {
    const status =
      result.code === "AGENT_NOT_FOUND"
        ? 404
        : result.code === "NOT_AGENT_OWNER"
          ? 403
          : 409; // AGENT_ALREADY_TERMINATED
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      agent: result.agent,
      refund: result.refund,
      balanceAfter: result.balanceAfter,
    },
  });
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
    { status: 401 },
  );
}
