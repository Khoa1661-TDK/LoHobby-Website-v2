-- CreateTable
CREATE TABLE "AddToCartEvent" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddToCartEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddToCartEvent_sessionId_idx" ON "AddToCartEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AddToCartEvent_productId_idx" ON "AddToCartEvent"("productId");

-- CreateIndex
CREATE INDEX "AddToCartEvent_createdAt_idx" ON "AddToCartEvent"("createdAt");
