import { NextResponse } from "next/server";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import {
  normalizeCredentialUsername,
  verifyCredentialPassword,
} from "@/modules/core/session/password-auth-shared";
import {
  resolveAuthorizedPlatformRole,
} from "@/modules/core/session/access-control";
import { signUnityAccessToken } from "@/modules/core/session/jwt-unity";
import { issueRefreshToken } from "@/modules/core/session/refresh-tokens";
import { readOrBackfillWallet } from "@/modules/core/economy/wallet-read";

// POST /api/auth/login
// Contract: docs/PHASE_01_API_CONTRACT.md §2.1

export const runtime = "nodejs";

type LoginBody = {
  username?: unknown;
  password?: unknown;
  clientVersion?: unknown;
  platform?: unknown;
};

const ALLOWED_PLATFORMS = new Set(["windows", "macos", "linux", "web"]);

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be JSON.", 400);
  }

  const rawUsername =
    typeof body.username === "string" ? body.username : null;
  const password = typeof body.password === "string" ? body.password : null;
  const clientVersion =
    typeof body.clientVersion === "string" ? body.clientVersion : null;
  const rawPlatform =
    typeof body.platform === "string" ? body.platform.toLowerCase() : null;

  if (!rawUsername || !password) {
    return errorResponse(
      "INVALID_BODY",
      "username and password are required.",
      400,
    );
  }

  const platform =
    rawPlatform && ALLOWED_PLATFORMS.has(rawPlatform) ? rawPlatform : "windows";

  const prisma = getPrismaClient();

  // Username may be an email OR a username. Try both paths before rejecting.
  const normalizedUsername = normalizeCredentialUsername(rawUsername);
  const looksLikeEmail = rawUsername.includes("@");

  const candidateWhere = looksLikeEmail
    ? { email: rawUsername.trim().toLowerCase() }
    : normalizedUsername
      ? { username: normalizedUsername }
      : null;

  if (!candidateWhere) {
    return errorResponse(
      "INVALID_CREDENTIALS",
      "Username or password is incorrect.",
      401,
    );
  }

  const user = await prisma.user.findUnique({
    where: candidateWhere,
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      passwordHash: true,
      role: true,
      status: true,
      avatarConfig: true,
      lastPosition: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
      businessMemberships: { select: { id: true }, take: 1 },
    },
  });

  if (!user || !user.passwordHash) {
    return errorResponse(
      "INVALID_CREDENTIALS",
      "Username or password is incorrect.",
      401,
    );
  }

  if (user.status === "FROZEN") {
    return errorResponse("ACCOUNT_FROZEN", "This account is frozen.", 403);
  }

  const passwordOk = await verifyCredentialPassword(
    user.passwordHash,
    password,
  );
  if (!passwordOk) {
    return errorResponse(
      "INVALID_CREDENTIALS",
      "Username or password is incorrect.",
      401,
    );
  }

  const platformRole = resolveAuthorizedPlatformRole({
    storedRole: user.role,
    username: user.username,
    businessMembershipCount: user.businessMemberships.length,
    ownedBusinessCount: user.ownedBusinesses.length,
  });

  const wallet = await readOrBackfillWallet(user.id);

  const access = await signUnityAccessToken({
    userId: user.id,
    username: user.username,
    role: platformRole,
  });

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const refresh = await issueRefreshToken({
    userId: user.id,
    platform,
    clientVersion,
    ipAddress,
  });

  const avatarConfig = extractAvatarConfig(user.avatarConfig) ?? defaultAvatar();

  return NextResponse.json({
    ok: true,
    data: {
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: platformRole,
      },
      avatar: avatarConfig,
      leafBalance: wallet.leafsBalance,
    },
  });
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

function defaultAvatar() {
  return { sprite: "seed-01", color: "#69f0ae", nameColor: "#ffffff" };
}

function extractAvatarConfig(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.sprite === "string" &&
    typeof obj.color === "string" &&
    typeof obj.nameColor === "string"
  ) {
    return { sprite: obj.sprite, color: obj.color, nameColor: obj.nameColor };
  }
  return null;
}
