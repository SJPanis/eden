import { NextResponse } from "next/server";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import { readOrBackfillWallet } from "@/modules/core/economy/wallet-read";

// GET /api/auth/me
// Contract: docs/PHASE_01_API_CONTRACT.md §2.4

export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
      { status: 401 },
    );
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      onboardingCompletedAt: true,
      referralCode: true,
      avatarConfig: true,
      lastPosition: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "USER_NOT_FOUND", message: "User no longer exists." } },
      { status: 404 },
    );
  }

  const wallet = await readOrBackfillWallet(user.id);

  return NextResponse.json({
    ok: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: identity.role,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      },
      leafBalance: wallet.leafsBalance,
      avatar: extractAvatarConfig(user.avatarConfig) ?? defaultAvatar(),
      lastPosition: extractLastPosition(user.lastPosition),
      referralCode: user.referralCode,
    },
  });
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

function extractLastPosition(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.x === "number" && typeof obj.y === "number") {
    return {
      x: obj.x,
      y: obj.y,
      zone: typeof obj.zone === "string" ? obj.zone : null,
    };
  }
  return null;
}
