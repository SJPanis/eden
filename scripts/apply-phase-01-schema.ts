// Phase 01 schema applier.
//
// Eden's prod DB was not initialized via `prisma migrate` — per PR #130, the
// `_prisma_migrations` table is empty, so `prisma migrate deploy` cannot run
// cleanly against prod. Schema changes are instead applied via idempotent raw
// SQL (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, etc.) either
// through the POST /api/admin/migrate endpoint or through one-shot scripts
// like this one.
//
// This script is the Railway-CLI equivalent of calling the HTTP endpoint —
// it runs the same statements via `prisma.$executeRawUnsafe()` without
// needing an owner session cookie.
//
// Execution (Railway-only — Eden has no local-DB workflow):
//
//   # Via Railway CLI
//   railway run npx tsx scripts/apply-phase-01-schema.ts
//
//   # Or paste into Railway dashboard → Eden service → Run Command
//   npx tsx scripts/apply-phase-01-schema.ts
//
// The canonical Prisma migration for the same changes lives at
// prisma/migrations/20260410120000_phase_01_unity_foundation/migration.sql.
// It's committed for the eventual day when prod is baselined and
// `prisma migrate deploy` becomes the canonical path again.

import { getPrismaClient } from "@/modules/core/repos/prisma-client";
import { phase01UnityFoundationStatements } from "@/modules/core/db/phase-01-migrations";

async function main() {
  const prisma = getPrismaClient();

  console.log(
    `[apply-phase-01] running ${phase01UnityFoundationStatements.length} idempotent statements`,
  );

  let ok = 0;
  let failed = 0;
  const failures: Array<{ preview: string; error: string }> = [];

  for (const sql of phase01UnityFoundationStatements) {
    const preview = sql.replace(/\s+/g, " ").slice(0, 80);
    try {
      await prisma.$executeRawUnsafe(sql);
      ok += 1;
      console.log(`  OK    ${preview}`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ preview, error: msg });
      console.error(`  ERR   ${preview}\n        ${msg}`);
    }
  }

  console.log(
    `\n[apply-phase-01] summary: ok=${ok} failed=${failed} total=${phase01UnityFoundationStatements.length}`,
  );

  if (failed > 0) {
    console.error(
      "[apply-phase-01] Some statements failed — investigate before continuing. Because every statement uses IF NOT EXISTS / DO blocks, genuine failures indicate a schema conflict, not a re-run collision.",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[apply-phase-01] fatal:", err);
    process.exit(1);
  })
  .finally(() => process.exit(process.exitCode ?? 0));
