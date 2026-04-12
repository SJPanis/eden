import { NextResponse } from "next/server";

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { resolveAuthenticatedUser } from "@/modules/core/session/resolve-authenticated-user";
import {
  DEFAULT_AVATAR,
  extractStoredAvatar,
  validateAvatarConfig,
} from "@/modules/core/avatar/avatar-config";

// GET/PUT /api/avatar/config
// Contract: docs/PHASE_01_API_CONTRACT.md §6

export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) return unauthorized();

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { avatarConfig: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "USER_NOT_FOUND", message: "User no longer exists." } },
      { status: 404 },
    );
  }

  const stored = extractStoredAvatar(user.avatarConfig);
  return NextResponse.json({
    ok: true,
    data: stored ?? DEFAULT_AVATAR,
  });
}

export async function PUT(request: Request) {
  const identity = await resolveAuthenticatedUser(request);
  if (!identity) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const result = validateAvatarConfig(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.error.code, message: result.error.message } },
      { status: 422 },
    );
  }

  const prisma = getPrismaClient();
  await prisma.user.update({
    where: { id: identity.userId },
    data: { avatarConfig: result.value },
  });

  return NextResponse.json({ ok: true, data: result.value });
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } },
    { status: 401 },
  );
}
