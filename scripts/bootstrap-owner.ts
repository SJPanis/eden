import { EdenRole } from "@prisma/client";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const requestedUsername = normalizeUsername(args[0]);
  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const { resolveConfiguredOwnerUsername } = await import(
    new URL("../modules/core/session/access-control.ts", import.meta.url).href
  );
  const configuredOwnerUsername = resolveConfiguredOwnerUsername();

  if (!configuredOwnerUsername) {
    throw new Error(
      "EDEN_OWNER_USERNAME is not configured. Set it before bootstrapping the owner account.",
    );
  }

  if (!requestedUsername) {
    throw new Error(
      "Provide the owner username to promote. It must match EDEN_OWNER_USERNAME exactly.",
    );
  }

  if (requestedUsername !== configuredOwnerUsername) {
    throw new Error(
      `Refusing owner bootstrap for "${requestedUsername}". The username must match EDEN_OWNER_USERNAME="${configuredOwnerUsername}".`,
    );
  }

  const prisma = getPrismaClient();

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        username: requestedUsername,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    if (!existingUser) {
      throw new Error(
        `No existing user was found for username "${requestedUsername}". Create the account first, then rerun the bootstrap.`,
      );
    }

    if (existingUser.role === EdenRole.OWNER) {
      console.info(
        `[eden-owner-bootstrap] User "${existingUser.username}" is already marked as OWNER.`,
      );
      return;
    }

    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        role: EdenRole.OWNER,
      },
    });

    console.info(
      `[eden-owner-bootstrap] Promoted "${existingUser.username}" to OWNER. Owner access still requires EDEN_OWNER_USERNAME to remain set to this username.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

function normalizeUsername(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function printUsage() {
  console.info("Usage: npm run owner:bootstrap -- <username>");
  console.info("");
  console.info(
    "Promotes an existing Eden user to OWNER only when <username> exactly matches EDEN_OWNER_USERNAME.",
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown owner bootstrap failure";

  console.error(`[eden-owner-bootstrap] ${message}`);
  process.exitCode = 1;
});
