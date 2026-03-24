-- Migration: sandbox_task_lifecycle_audit_v1
-- Adds immutable task-level lifecycle audit records separate from runtime-level audit logs.
-- This is additive only. No existing tables are modified.

-- Enum: ProjectRuntimeTaskAuditEventType
CREATE TYPE "ProjectRuntimeTaskAuditEventType" AS ENUM (
  'TASK_CREATED',
  'PLANNER_COMPLETED',
  'WORKER_COMPLETED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'DISPATCH_PREPARED',
  'LIVE_EXECUTION_ATTEMPTED',
  'LIVE_EXECUTION_COMPLETED',
  'LIVE_EXECUTION_FAILED'
);

-- Model: ProjectRuntimeTaskAuditLog
CREATE TABLE "ProjectRuntimeTaskAuditLog" (
  "id"          TEXT         NOT NULL,
  "runtimeId"   TEXT         NOT NULL,
  "taskId"      TEXT         NOT NULL,
  "actorUserId" TEXT         NOT NULL,
  "eventType"   "ProjectRuntimeTaskAuditEventType" NOT NULL,
  "detail"      TEXT         NOT NULL,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectRuntimeTaskAuditLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ProjectRuntimeTaskAuditLog"
  ADD CONSTRAINT "ProjectRuntimeTaskAuditLog_runtimeId_fkey"
  FOREIGN KEY ("runtimeId")
  REFERENCES "ProjectRuntime"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectRuntimeTaskAuditLog"
  ADD CONSTRAINT "ProjectRuntimeTaskAuditLog_taskId_fkey"
  FOREIGN KEY ("taskId")
  REFERENCES "ProjectRuntimeTask"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectRuntimeTaskAuditLog"
  ADD CONSTRAINT "ProjectRuntimeTaskAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId")
  REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "ProjectRuntimeTaskAuditLog_runtimeId_createdAt_idx"
  ON "ProjectRuntimeTaskAuditLog"("runtimeId", "createdAt");

CREATE INDEX "ProjectRuntimeTaskAuditLog_taskId_createdAt_idx"
  ON "ProjectRuntimeTaskAuditLog"("taskId", "createdAt");

CREATE INDEX "ProjectRuntimeTaskAuditLog_actorUserId_createdAt_idx"
  ON "ProjectRuntimeTaskAuditLog"("actorUserId", "createdAt");

CREATE INDEX "ProjectRuntimeTaskAuditLog_eventType_createdAt_idx"
  ON "ProjectRuntimeTaskAuditLog"("eventType", "createdAt");
