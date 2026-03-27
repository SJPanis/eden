CREATE TABLE IF NOT EXISTS "PlatformRevenue" (
  "id" TEXT NOT NULL,
  "amountLeafs" INTEGER NOT NULL,
  "usdValue" DOUBLE PRECISION NOT NULL,
  "sourceService" TEXT NOT NULL DEFAULT 'unknown',
  "userId" TEXT NOT NULL,
  "swept" BOOLEAN NOT NULL DEFAULT false,
  "stripeTransferId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformRevenue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContributionPool" (
  "id" TEXT NOT NULL,
  "amountLeafs" INTEGER NOT NULL,
  "sourceService" TEXT NOT NULL DEFAULT 'unknown',
  "userId" TEXT NOT NULL,
  "distributed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContributionPool_pkey" PRIMARY KEY ("id")
);
