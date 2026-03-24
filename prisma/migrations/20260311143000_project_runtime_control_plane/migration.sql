- CreateEnum
CREATE TYPE "ProjectRuntimeType" AS ENUM ('INTERNAL_SANDBOX', 'INTERNAL_PREVIEW', 'EDEN_MANAGED_INSTANCE', 'EXTERNAL_LINKED_DOMAIN');

-- CreateEnum
CREATE TYPE "ProjectRuntimeEnvironment" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ProjectRuntimeTarget" AS ENUM ('EDEN_INTERNAL', 'EDEN_MANAGED', 'EXTERNAL_DOMAIN');

-- CreateEnum
CREATE TYPE "ProjectRuntimeAccessPolicy" AS ENUM ('OWNER_ONLY', 'BUSINESS_MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ProjectRuntimeVisibility" AS ENUM ('PRIVATE_INTERNAL', 'PRIVATE_PREVIEW', 'PUBLIC_LAUNCH');

-- CreateEnum
CREATE TYPE "ProjectRuntimeStatus" AS ENUM ('REGISTERED', 'CONFIGURING', 'READY', 'PAUSED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectRuntimeDomainLinkType" AS ENUM ('INTERNAL_PREVIEW', 'EDEN_MANAGED', 'LINKED_EXTERNAL');

-- CreateTable
CREATE TABLE "ProjectRuntime" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "runtimeType" "ProjectRuntimeType" NOT NULL,
    "environment" "ProjectRuntimeEnvironment" NOT NULL DEFAULT 'DEVELOPMENT',
    "target" "ProjectRuntimeTarget" NOT NULL DEFAULT 'EDEN_INTERNAL',
    "accessPolicy" "ProjectRuntimeAccessPolicy" NOT NULL DEFAULT 'BUSINESS_MEMBERS',
    "visibility" "ProjectRuntimeVisibility" NOT NULL DEFAULT 'PRIVATE_PREVIEW',
    "status" "ProjectRuntimeStatus" NOT NULL DEFAULT 'REGISTERED',
    "runtimeLocator" TEXT,
    "statusDetail" TEXT,
    "lastHealthCheckAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRuntimeDomainLink" (
    "id" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "linkType" "ProjectRuntimeDomainLinkType" NOT NULL,
    "hostname" TEXT NOT NULL,
    "pathPrefix" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRuntimeDomainLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRuntime_projectId_createdAt_idx" ON "ProjectRuntime"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntime_runtimeType_environment_createdAt_idx" ON "ProjectRuntime"("runtimeType", "environment", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRuntime_status_createdAt_idx" ON "ProjectRuntime"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntime_projectId_environment_runtimeType_key" ON "ProjectRuntime"("projectId", "environment", "runtimeType");

-- CreateIndex
CREATE INDEX "ProjectRuntimeDomainLink_runtimeId_createdAt_idx" ON "ProjectRuntimeDomainLink"("runtimeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRuntimeDomainLink_runtimeId_hostname_pathPrefix_key" ON "ProjectRuntimeDomainLink"("runtimeId", "hostname", "pathPrefix");

-- AddForeignKey
ALTER TABLE "ProjectRuntime" ADD CONSTRAINT "ProjectRuntime_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntime" ADD CONSTRAINT "ProjectRuntime_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRuntimeDomainLink" ADD CONSTRAINT "ProjectRuntimeDomainLink_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "ProjectRuntime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
