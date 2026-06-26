-- CreateTable
CREATE TABLE "PurchaseEvent" (
    "id" TEXT NOT NULL,
    "anonId" TEXT,
    "customerId" TEXT,
    "orderCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseEvent_anonId_idx" ON "PurchaseEvent"("anonId");

-- CreateIndex
CREATE INDEX "PurchaseEvent_createdAt_idx" ON "PurchaseEvent"("createdAt");
