- CreateTable
CREATE TABLE "ProjectRuntimeAuditLog" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "previousValue" TEXT,
    "nextValue" TEXT,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRuntimeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRuntimeAuditLog_runtimeId_createdAt_idx" ON "ProjectRuntimeAuditLog"("runtimeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAuditLog_actorUserId_createdAt_idx" ON "ProjectRuntimeAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntimeAuditLog_fieldName_createdAt_idx" ON "ProjectRuntimeAuditLog"("fieldName", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectRuntimeAuditLog" ADD CONSTRAINT "ProjectRuntimeAuditLog_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeAuditLog" ADD CONSTRAINT "ProjectRuntimeAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
