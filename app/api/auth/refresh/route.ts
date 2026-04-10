import { NextResponse } from "next/server";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  resolveAuthorizedPlatformRole,
} from "@/modules/core/session/access-control";
import { signUnityAccessToken } from "@/modules/core/session/jwt-unity";
import { rotateRefreshToken } from "@/modules/core/session/refresh-tokens";

// POST /api/auth/refresh
// Contract: docs/PHASE_01_API_CONTRACT.md §2.2

export const runtime = "nodejs";

type RefreshBody = {
  refreshToken?: unknown;
  platform?: unknown;
  clientVersion?: unknown;
};

const ALLOWED_PLATFORMS = new Set(["windows", "macos", "linux", "web"]);

export async function POST(request: Request) {
  let body: RefreshBody;
  try {
    body = (await request.json()) as RefreshBody;
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be JSON.", 400);
  }

  const presentedToken =
    typeof body.refreshToken === "string" ? body.refreshToken : null;
  if (!presentedToken) {
    return errorResponse("INVALID_BODY", "refreshToken is required.", 400);
  }

  const rawPlatform =
    typeof body.platform === "string" ? body.platform.toLowerCase() : null;
  const platform =
    rawPlatform && ALLOWED_PLATFORMS.has(rawPlatform) ? rawPlatform : "windows";
  const clientVersion =
    typeof body.clientVersion === "string" ? body.clientVersion : null;

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const rotation = await rotateRefreshToken({
    presentedToken,
    platform,
    clientVersion,
    ipAddress,
  });

  if (!rotation.ok) {
    const statusByCode = {
      REFRESH_TOKEN_INVALID: 401,
      REFRESH_TOKEN_EXPIRED: 401,
      REFRESH_TOKEN_REVOKED: 401,
    } as const;
    return errorResponse(
      rotation.code,
      humanizeCode(rotation.code),
      statusByCode[rotation.code],
    );
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: rotation.userId },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
      businessMemberships: { select: { id: true }, take: 1 },
    },
  });

  if (!user) {
    return errorResponse(
      "REFRESH_TOKEN_INVALID",
      "Associated user no longer exists.",
      401,
    );
  }
  if (user.status === "FROZEN") {
    return errorResponse("ACCOUNT_FROZEN", "This account is frozen.", 403);
  }

  const platformRole = resolveAuthorizedPlatformRole({
    storedRole: user.role,
    username: user.username,
    businessMembershipCount: user.businessMemberships.length,
    ownedBusinessCount: user.ownedBusinesses.length,
  });

  const access = await signUnityAccessToken({
    userId: user.id,
    username: user.username,
    role: platformRole,
  });

  return NextResponse.json({
    ok: true,
    data: {
      accessToken: access.token,
      refreshToken: rotation.newToken.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshTokenExpiresAt: rotation.newToken.expiresAt.toISOString(),
    },
  });
}

function humanizeCode(code: string) {
  switch (code) {
    case "REFRESH_TOKEN_INVALID":
      return "Refresh token is not recognized.";
    case "REFRESH_TOKEN_EXPIRED":
      return "Refresh token has expired.";
    case "REFRESH_TOKEN_REVOKED":
      return "Refresh token was revoked; please log in again.";
    default:
      return "Refresh failed.";
  }
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}
