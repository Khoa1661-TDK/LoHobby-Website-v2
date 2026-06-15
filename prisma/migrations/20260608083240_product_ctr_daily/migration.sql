-- CreateTable
CREATE TABLE "ProductCtrDaily" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCtrDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCtrDaily_day_idx" ON "ProductCtrDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCtrDaily_productId_day_key" ON "ProductCtrDaily"("productId", "day");
