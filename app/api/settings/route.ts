import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { getServerSession } from "@/modules/core/session/server";
import {
  hashCredentialPassword,
  isValidCredentialPassword,
  normalizeCredentialUsername,
  isValidCredentialUsername,
  verifyCredentialPassword,
} from "@/modules/core/session/password-auth";

export const runtime = "nodejs";

/** PATCH /api/settings — update display name or username */
export async function PATCH(request: Request) {
  const session = await getServerSession();

  if (session.auth.source !== "persistent") {
    return NextResponse.json({ ok: false, error: "Sign in to update your account." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    displayName?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  } | null;

  const userId = session.user.id;
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, passwordHash: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  // Display name update
  if (body?.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (!trimmed) {
      return NextResponse.json({ ok: false, error: "Display name cannot be empty." }, { status: 400 });
    }
    updates.displayName = trimmed;
  }

  // Username update
  if (body?.username !== undefined) {
    const normalized = normalizeCredentialUsername(body.username);
    if (!normalized || !isValidCredentialUsername(normalized)) {
      return NextResponse.json(
        { ok: false, error: "Username must be 3–32 characters and contain only letters, numbers, dots, underscores, or hyphens." },
        { status: 400 },
      );
    }
    if (normalized !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username: normalized }, select: { id: true } });
      if (existing) {
        return NextResponse.json({ ok: false, error: "That username is already taken." }, { status: 409 });
      }
      updates.username = normalized;
      // Keep auth provider account in sync
      await prisma.authProviderAccount.updateMany({
        where: { userId, provider: "credentials" },
        data: { providerSubject: normalized },
      });
    }
  }

  // Password change
  if (body?.newPassword !== undefined) {
    if (!body.currentPassword) {
      return NextResponse.json({ ok: false, error: "Enter your current password to set a new one." }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ ok: false, error: "Password auth is not enabled on this account." }, { status: 400 });
    }
    const valid = await verifyCredentialPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 403 });
    }
    if (!isValidCredentialPassword(body.newPassword)) {
      return NextResponse.json({ ok: false, error: "New password must be at least 8 characters." }, { status: 400 });
    }
    updates.passwordHash = await hashCredentialPassword(body.newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to update." });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, username: true, displayName: true, role: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
