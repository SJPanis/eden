async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const providedUsername = args[0] ?? null;
  const providedPassword = args[1] ?? null;

  const { getPrismaClient } = await import(
    new URL("../modules/core/repos/prisma-client.ts", import.meta.url).href
  );
  const {
    hashCredentialPassword,
    isValidCredentialPassword,
    isValidCredentialUsername,
    normalizeCredentialUsername,
  } = await import(
    new URL(
      "../modules/core/session/password-auth-shared.ts",
      import.meta.url
    ).href
  );

  const username = normalizeCredentialUsername(providedUsername);
  const password = typeof providedPassword === "string" ? providedPassword : "";

  if (!username || !isValidCredentialUsername(username)) {
    throw new Error(
      "Provide a valid existing username. Usernames must match Eden credential rules.",
    );
  }

  if (!isValidCredentialPassword(password)) {
    throw new Error(
      "Provide a valid new password. Passwords must be between 8 and 128 characters.",
    );
  }

  const prisma = getPrismaClient();

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!existingUser) {
      throw new Error(
        `No existing user was found for username "${username}". Password reset only supports persisted users.`,
      );
    }

    const passwordHash = await hashCredentialPassword(password);

    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        passwordHash,
      },
    });

    console.info(
      `[eden-password-reset] Updated password for "${existingUser.username}".`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

function printUsage() {
  console.info('Usage: npm run password:reset -- <username> "<new-password>"');
  console.info("");
  console.info(
    "Resets the password for an existing Eden user. The user must already exist.",
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown password reset failure";

  console.error(`[eden-password-reset] ${message}`);
  process.exitCode = 1;
});
