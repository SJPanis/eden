import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";

// Refresh tokens are opaque random strings persisted server-side as sha256
// hashes. Each refresh rotates the token — old is marked revoked, new is
// inserted. Presenting a revoked refresh token triggers a full invalidation
// of the user's refresh chain (standard reuse-detection defense).

const REFRESH_TOKEN_PREFIX = "rt_";
const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export type IssuedRefreshToken = {
  id: string;
  token: string;
  expiresAt: Date;
};

export type IssueRefreshTokenInput = {
  userId: string;
  platform: string;
  clientVersion?: string | null;
  ipAddress?: string | null;
  replacesTokenId?: string | null;
};

function generateRawToken(): string {
  return `${REFRESH_TOKEN_PREFIX}${randomBytes(REFRESH_TOKEN_BYTES).toString("hex")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(
  input: IssueRefreshTokenInput,
): Promise<IssuedRefreshToken> {
  const prisma = getPrismaClient();
  const token = generateRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const row = await prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash,
      platform: input.platform,
      clientVersion: input.clientVersion ?? null,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
    },
    select: { id: true },
  });

  if (input.replacesTokenId) {
    await prisma.refreshToken.update({
      where: { id: input.replacesTokenId },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: row.id,
      },
    });
  }

  return { id: row.id, token, expiresAt };
}

export type RotateRefreshTokenResult =
  | {
      ok: true;
      userId: string;
      newToken: IssuedRefreshToken;
    }
  | {
      ok: false;
      code:
        | "REFRESH_TOKEN_INVALID"
        | "REFRESH_TOKEN_EXPIRED"
        | "REFRESH_TOKEN_REVOKED";
    };

export async function rotateRefreshToken(input: {
  presentedToken: string;
  platform: string;
  clientVersion?: string | null;
  ipAddress?: string | null;
}): Promise<RotateRefreshTokenResult> {
  if (!input.presentedToken.startsWith(REFRESH_TOKEN_PREFIX)) {
    return { ok: false, code: "REFRESH_TOKEN_INVALID" };
  }

  const prisma = getPrismaClient();
  const tokenHash = hashToken(input.presentedToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!existing) {
    return { ok: false, code: "REFRESH_TOKEN_INVALID" };
  }

  if (existing.revokedAt) {
    // Reuse-detection: invalidate every refresh token for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: false, code: "REFRESH_TOKEN_REVOKED" };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: "REFRESH_TOKEN_EXPIRED" };
  }

  // Mark lastUsedAt on the token we're about to rotate, then issue the new one.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { lastUsedAt: new Date() },
  });

  const newToken = await issueRefreshToken({
    userId: existing.userId,
    platform: input.platform,
    clientVersion: input.clientVersion,
    ipAddress: input.ipAddress,
    replacesTokenId: existing.id,
  });

  return { ok: true, userId: existing.userId, newToken };
}

export async function revokeRefreshToken(token: string): Promise<boolean> {
  if (!token.startsWith(REFRESH_TOKEN_PREFIX)) return false;
  const prisma = getPrismaClient();
  const tokenHash = hashToken(token);
  const res = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}

export async function revokeAllRefreshTokensForUser(
  userId: string,
): Promise<number> {
  const prisma = getPrismaClient();
  const res = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export const REFRESH_TOKEN_TTL_DAYS_EXPORT = REFRESH_TOKEN_TTL_DAYS;
