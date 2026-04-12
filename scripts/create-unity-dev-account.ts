// One-shot script: create a throwaway dev account for Unity Phase 02 testing.
// DELETE THIS ACCOUNT after Phase 02 sign-off — see memory note.
//
// Execution:
//   railway run npx tsx scripts/create-unity-dev-account.ts

import { hash } from "@node-rs/argon2";
import { getPrismaClient } from "@/modules/core/repos/prisma-client";

const USERNAME = "unity-dev";
const EMAIL = "unity-dev@eden.local";
const PASSWORD = "unitydev123";
const DISPLAY_NAME = "Unity Dev (Phase 02)";
const LEAF_GRANT = 500;

async function hashPassword(password: string) {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

async function main() {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: USERNAME }, { email: EMAIL }] },
    select: { id: true, username: true },
  });

  let userId: string;

  if (existing) {
    console.log(
      `[create-unity-dev] account already exists: id=${existing.id} username=${existing.username}`,
    );
    userId = existing.id;
  } else {
    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.create({
      data: {
        username: USERNAME,
        email: EMAIL,
        displayName: DISPLAY_NAME,
        passwordHash,
        role: "CONSUMER",
        status: "ACTIVE",
      },
      select: { id: true, username: true },
    });
    console.log(`[create-unity-dev] created user: id=${user.id} username=${user.username}`);
    userId = user.id;
  }

  const wallet = await prisma.edenWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  await prisma.$transaction([
    prisma.edenTransaction.create({
      data: {
        walletId: wallet.id,
        actorUserId: userId,
        transactionType: "LEAFS_GRANT",
        status: "COMPLETED",
        leafsAmount: LEAF_GRANT,
        description: "Phase 02 Unity dev testing grant",
      },
    }),
    prisma.edenWallet.update({
      where: { id: wallet.id },
      data: {
        leafsBalance: { increment: LEAF_GRANT },
        totalGrantedLeafs: { increment: LEAF_GRANT },
      },
    }),
  ]);

  const updated = await prisma.edenWallet.findUnique({
    where: { userId },
    select: { leafsBalance: true },
  });

  console.log(`[create-unity-dev] granted ${LEAF_GRANT} Leafs — balance=${updated?.leafsBalance}`);
  console.log(`[create-unity-dev] credentials: username=${USERNAME} password=${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("[create-unity-dev] fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
