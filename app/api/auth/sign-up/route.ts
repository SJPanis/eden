import { type NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { rateLimit } from "@/modules/core/lib/rate-limit";
import { resolveConfiguredOwnerUsername } from "@/modules/core/session/access-control";
import {
  hashCredentialPassword,
  isValidCredentialPassword,
  isValidCredentialUsername,
  normalizeCredentialUsername,
} from "@/modules/core/session/password-auth";

const earlyAccessEnabled = process.env.EDEN_EARLY_ACCESS_ENABLED === "true";
const BETA_WELCOME_LEAVES = 100;

export async function POST(request: NextRequest) {
  // Rate limit: 5 sign-up attempts per IP per 15 minutes
  const limit = rateLimit(request, "signup", 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }
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
      // Rate limit invalid invite code attempts: 10 per IP per hour
      const codeLimit = rateLimit(request, "invite", 10, 60 * 60 * 1000);
      if (!codeLimit.allowed) {
        return NextResponse.json(
          { ok: false, error: "Too many invalid code attempts. Try again later." },
          { status: 429, headers: { "Retry-After": String(codeLimit.retryAfter) } },
        );
      }
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

  try {
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

    try {
      await getPrismaClient().authProviderAccount.create({
        data: {
          provider: "credentials",
          providerSubject: username,
          userId: createdUser.id,
        },
      });
    } catch (error) {
      console.error("[sign-up] failed to create auth provider account:", error);
      // Roll back: delete the user we just created since auth linking failed
      await getPrismaClient().user.delete({ where: { id: createdUser.id } }).catch(() => {});
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { ok: false, error: "Unable to create your Eden account.", detail: message },
        { status: 500 },
      );
    }

    // Increment code use count and record the welcome grant audit trail
    if (resolvedCodeId) {
      try {
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
      } catch (error) {
        // Non-fatal: user was created successfully, just log the audit/code-increment failure
        console.error("[sign-up] failed to update access code / create grant record:", error);
      }
    }

    return NextResponse.json({
      ok: true,
      user: createdUser,
      welcomeLeaves: resolvedCodeId ? BETA_WELCOME_LEAVES : 0,
    });
  } catch (error) {
    console.error("[sign-up] failed to create user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: "Unable to create your Eden account.", detail: message },
      { status: 500 },
    );
  }
}
