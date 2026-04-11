// Seed an initial placeholder ClientVersion row so GET /api/version has
// something to return before the real Unity client exists. Idempotent — uses
// upsert on the unique `version` key, so re-runs update in place.
//
// Execution (Railway-only — Eden has no local-DB workflow):
//
//   railway run npx tsx scripts/seed-initial-client-version.ts
//
// The seeded row carries version "0.0.0-phase-01" with placeholder download
// URLs and sha256 hashes. Unity clients seeing this row will be told a real
// build does not exist yet. Replace via POST /api/admin/release (when that
// lands) or a follow-up run of this script.

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { registerClientVersion } from "@/modules/core/releases/client-version-service";

const PLACEHOLDER_VERSION = "0.0.0-phase-01";
const PLACEHOLDER_MIN = "0.0.0";

async function main() {
  const prisma = getPrismaClient();

  // Find an owner to credit as the releaser. Any OWNER-role user works; if
  // none exist, fall back to the most recently created user so the FK holds.
  const owner =
    (await prisma.user.findFirst({
      where: { role: "OWNER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, role: true },
    })) ??
    (await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, role: true },
    }));

  if (!owner) {
    console.error(
      "[seed-client-version] No users exist on prod yet — cannot satisfy the releasedByUserId FK.",
    );
    process.exit(1);
  }

  console.log(
    `[seed-client-version] releaser=${owner.username} (role=${owner.role})`,
  );

  const snapshot = await registerClientVersion({
    version: PLACEHOLDER_VERSION,
    minimumSupportedVersion: PLACEHOLDER_MIN,
    required: false,
    platforms: {
      windows: {
        url: "https://cdn.edencloud.app/client/placeholder/Eden-placeholder.exe",
        sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        size: 0,
      },
      macos: {
        url: "https://cdn.edencloud.app/client/placeholder/Eden-placeholder.dmg",
        sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        size: 0,
      },
    },
    changelog:
      "Phase 01 placeholder release. No real Unity client binary exists yet — this row exists so GET /api/version returns a valid payload for contract testing.",
    assetManifest: null,
    releasedByUserId: owner.id,
  });

  console.log(
    `[seed-client-version] upserted: version=${snapshot.version} required=${snapshot.required} releasedAt=${snapshot.releasedAt}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed-client-version] fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
