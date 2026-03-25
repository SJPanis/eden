import { NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { resolveConfiguredOwnerUsername } from "@/modules/core/session/access-control";
import {
  hashCredentialPassword,
  isValidCredentialPassword,
  isValidCredentialUsername,
  normalizeCredentialUsername,
} from "@/modules/core/session/password-auth";

const earlyAccessEnabled = process.env.EDEN_EARLY_ACCESS_ENABLED === "true";
const BETA_WELCOME_LEAVES = 100;

export async function POST(request: Request) {
  const requestBody = (await request.json().catch(() => null)) as
    | {
        username?: string;
        password?: string;
        displayName?: string;
        accessCode?: string;
      }
    | null;

  const username = normalizeCredentialUsername(requestBody?.username);
  const password = requestBody?.password ?? "";
  const displayName = requestBody?.displayName?.trim() || username || "Eden User";
  const accessCode = requestBody?.accessCode?.trim().toUpperCase() || null;

  if (!username || !isValidCredentialUsername(username) || !isValidCredentialPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Enter a valid username and a password with at least 8 characters.",
      },
      { status: 400 },
    );
  }

  if (username === resolveConfiguredOwnerUsername()) {
    return NextResponse.json(
      { ok: false, error: "That username is unavailable." },
      { status: 409 },
    );
  }

  // ── Early access gate ──────────────────────────────────────────────────────
  let resolvedCodeId: string | null = null;

  if (earlyAccessEnabled) {
    if (!accessCode) {
      return NextResponse.json(
        { ok: false, error: "An early access code is required to create an account.", requiresCode: true },
        { status: 403 },
      );
    }

    const codeRecord = await getPrismaClient().earlyAccessCode.findUnique({
      where: { code: accessCode },
      select: { id: true, isActive: true, maxUses: true, useCount: true },
    });

    if (!codeRecord || !codeRecord.isActive || codeRecord.useCount >= codeRecord.maxUses) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired early access code.", requiresCode: true },
        { status: 403 },
      );
    }

    resolvedCodeId = codeRecord.id;
  }
  // ── End early access gate ──────────────────────────────────────────────────

  const existingUser = await getPrismaClient().user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, error: "That username is unavailable." },
      { status: 409 },
    );
  }

  const passwordHash = await hashCredentialPassword(password);

  const createdUser = await getPrismaClient().user.create({
    data: {
      username,
      displayName,
      passwordHash,
      role: "CONSUMER",
      // Beta welcome gift: 100 Leaf's granted when signing up with an access code
      edenBalanceCredits: resolvedCodeId ? BETA_WELCOME_LEAVES : 0,
      ...(resolvedCodeId ? { accessCodeId: resolvedCodeId } : {}),
    },
    select: { id: true, username: true, displayName: true },
  });

  await getPrismaClient().authProviderAccount.create({
    data: {
      provider: "credentials",
      providerSubject: username,
      userId: createdUser.id,
    },
  });

  // Increment code use count and record the welcome grant audit trail
  if (resolvedCodeId) {
    const ownerUsername = resolveConfiguredOwnerUsername();
    const ownerUser = ownerUsername
      ? await getPrismaClient().user.findUnique({
          where: { username: ownerUsername },
          select: { id: true },
        })
      : null;

    await Promise.all([
      // Increment use count on the code
      getPrismaClient().earlyAccessCode.update({
        where: { id: resolvedCodeId },
        data: { useCount: { increment: 1 } },
      }),
      // Create audit grant record (uses owner's ID if found, otherwise self-grant)
      getPrismaClient().ownerLeavesGrant.create({
        data: {
          userId: createdUser.id,
          grantedByUserId: ownerUser?.id ?? createdUser.id,
          amountCredits: BETA_WELCOME_LEAVES,
          note: `Beta welcome gift — ${BETA_WELCOME_LEAVES} Leaf's granted on account creation with access code.`,
        },
      }),
    ]);
  }

  return NextResponse.json({
    ok: true,
    user: createdUser,
    welcomeLeaves: resolvedCodeId ? BETA_WELCOME_LEAVES : 0,
  });
}
