CREATE TABLE IF NOT EXISTS "AgentBuild" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "request" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "totalLeafs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentBuild_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentTask" (
  "id" TEXT NOT NULL,
  "buildId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "result" TEXT,
  "leafCost" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentTask_buildId_idx" ON "AgentTask"("buildId");

ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_buildId_fkey"
  FOREIGN KEY ("buildId") REFERENCES "AgentBuild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
