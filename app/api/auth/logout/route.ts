import { NextResponse } from "next/server";

import {
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
} from "@/modules/core/session/refresh-tokens";
import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";

// POST /api/auth/logout
// Contract: docs/PHASE_01_API_CONTRACT.md §2.3

export const runtime = "nodejs";

type LogoutBody = {
  refreshToken?: unknown;
  everywhere?: unknown;
};

export async function POST(request: Request) {
  let body: LogoutBody = {};
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as LogoutBody) : {};
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be JSON.", 400);
  }

  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken : null;
  const everywhere = body.everywhere === true;

  if (everywhere) {
    const identity = await resolveAuthenticatedUser(request);
    if (!identity) {
      return errorResponse(
        "UNAUTHORIZED",
        "A valid access token is required for everywhere logout.",
        401,
      );
    }
    await revokeAllRefreshTokensForUser(identity.userId);
    return new NextResponse(null, { status: 204 });
  }

  if (!refreshToken) {
    return errorResponse(
      "INVALID_BODY",
      "refreshToken is required unless everywhere=true.",
      400,
    );
  }

  await revokeRefreshToken(refreshToken);
  return new NextResponse(null, { status: 204 });
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}
