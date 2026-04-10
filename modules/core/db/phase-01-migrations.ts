// Phase 01 Unity world schema statements.
//
// These mirror the canonical source-of-truth Prisma migration at
// prisma/migrations/20260410120000_phase_01_unity_foundation/migration.sql,
// but are expressed as an array of idempotent single-statement SQL strings
// that can be driven through prisma.$executeRawUnsafe() by any caller.
//
// Two consumers today:
//   1. scripts/apply-phase-01-schema.ts — invoked via `railway run` to apply
//      the schema to the live Railway environment.
//   2. app/api/admin/migrate/route.ts — the legacy owner-only HTTP migrate
//      endpoint, which appends this array to its existing migrations list so
//      calling POST /api/admin/migrate also brings a DB up to Phase 01.
//
// Every statement uses IF NOT EXISTS / DO...EXCEPTION so re-runs are no-ops.
// Keep this list in sync with the Prisma migration SQL if either is edited.

export const phase01UnityFoundationStatements: string[] = [
  // ── Enums (Postgres has no CREATE TYPE IF NOT EXISTS) ────────────────────
  `DO $$ BEGIN CREATE TYPE "AgentType" AS ENUM ('ARTIST', 'ARCHITECT'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE "AgentState" AS ENUM ('SPAWNING', 'WALKING', 'WORKING', 'COMPLETING', 'TERMINATING', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // ── User additive columns ────────────────────────────────────────────────
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarConfig" JSONB`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPosition" JSONB`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastOnline" TIMESTAMP(3)`,

  // ── Agent ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "Agent" (
    "id"           TEXT         NOT NULL,
    "type"         "AgentType"  NOT NULL,
    "state"        "AgentState" NOT NULL DEFAULT 'SPAWNING',
    "ownerId"      TEXT         NOT NULL,
    "taskSummary"  TEXT         NOT NULL,
    "taskDetail"   JSONB,
    "zoneTarget"   TEXT         NOT NULL,
    "position"     JSONB        NOT NULL,
    "progress"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result"       JSONB,
    "leafCost"     INTEGER      NOT NULL DEFAULT 0,
    "leafReward"   INTEGER      NOT NULL DEFAULT 0,
    "prTag"        TEXT,
    "prUrl"        TEXT,
    "spawnedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"  TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Agent_ownerId_spawnedAt_idx" ON "Agent"("ownerId", "spawnedAt")`,
  `CREATE INDEX IF NOT EXISTS "Agent_state_spawnedAt_idx" ON "Agent"("state", "spawnedAt")`,
  `CREATE INDEX IF NOT EXISTS "Agent_zoneTarget_idx" ON "Agent"("zoneTarget")`,
  `ALTER TABLE "Agent" DROP CONSTRAINT IF EXISTS "Agent_ownerId_fkey"`,
  `ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // ── WorldSession ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "WorldSession" (
    "id"             TEXT         NOT NULL,
    "userId"         TEXT         NOT NULL,
    "connectedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "clientVersion"  TEXT         NOT NULL,
    "platform"       TEXT         NOT NULL,
    "socketId"       TEXT         NOT NULL,
    "ipAddress"      TEXT,
    CONSTRAINT "WorldSession_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "WorldSession_userId_connectedAt_idx" ON "WorldSession"("userId", "connectedAt")`,
  `CREATE INDEX IF NOT EXISTS "WorldSession_disconnectedAt_idx" ON "WorldSession"("disconnectedAt")`,
  `CREATE INDEX IF NOT EXISTS "WorldSession_socketId_idx" ON "WorldSession"("socketId")`,
  `ALTER TABLE "WorldSession" DROP CONSTRAINT IF EXISTS "WorldSession_userId_fkey"`,
  `ALTER TABLE "WorldSession" ADD CONSTRAINT "WorldSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

  // ── ClientVersion ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ClientVersion" (
    "id"                      TEXT         NOT NULL,
    "version"                 TEXT         NOT NULL,
    "minimumSupportedVersion" TEXT         NOT NULL,
    "required"                BOOLEAN      NOT NULL DEFAULT true,
    "platforms"               JSONB        NOT NULL,
    "changelog"               TEXT,
    "assetManifest"           JSONB,
    "releasedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedByUserId"        TEXT         NOT NULL,
    CONSTRAINT "ClientVersion_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ClientVersion_version_key" ON "ClientVersion"("version")`,
  `CREATE INDEX IF NOT EXISTS "ClientVersion_releasedAt_idx" ON "ClientVersion"("releasedAt")`,
  `ALTER TABLE "ClientVersion" DROP CONSTRAINT IF EXISTS "ClientVersion_releasedByUserId_fkey"`,
  `ALTER TABLE "ClientVersion" ADD CONSTRAINT "ClientVersion_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,

  // ── RefreshToken ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id"                TEXT         NOT NULL,
    "userId"            TEXT         NOT NULL,
    "tokenHash"         TEXT         NOT NULL,
    "platform"          TEXT         NOT NULL,
    "clientVersion"     TEXT,
    "issuedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"         TIMESTAMP(3) NOT NULL,
    "revokedAt"         TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "lastUsedAt"        TIMESTAMP(3),
    "ipAddress"         TEXT,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_issuedAt_idx" ON "RefreshToken"("userId", "issuedAt")`,
  `ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey"`,
  `ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];
