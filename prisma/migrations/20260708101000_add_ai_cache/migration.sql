-- CreateTable
CREATE TABLE "AiCache" (
    "id" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "cachedResponse" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCache_featureKey_payloadHash_key" ON "AiCache"("featureKey", "payloadHash");

-- CreateIndex
CREATE INDEX "AiCache_featureKey_idx" ON "AiCache"("featureKey");

