-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Download_platform_idx" ON "Download"("platform");

-- CreateIndex
CREATE INDEX "Download_createdAt_idx" ON "Download"("createdAt");
