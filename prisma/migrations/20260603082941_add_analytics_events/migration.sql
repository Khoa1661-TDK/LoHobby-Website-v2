/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SHIPMENT', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'PAY_ONLINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_COD';
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_ONLINE';

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "deliveryMethod" "DeliveryMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "shippingAddress" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productHandle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "productTitle" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "Product";

-- CreateTable
CREATE TABLE "VisitSession" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "campaign" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductViewEvent" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL DEFAULT '',
    "dwellMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitSession_sessionId_key" ON "VisitSession"("sessionId");

-- CreateIndex
CREATE INDEX "VisitSession_source_idx" ON "VisitSession"("source");

-- CreateIndex
CREATE INDEX "VisitSession_firstSeenAt_idx" ON "VisitSession"("firstSeenAt");

-- CreateIndex
CREATE INDEX "ProductViewEvent_productId_idx" ON "ProductViewEvent"("productId");

-- CreateIndex
CREATE INDEX "ProductViewEvent_createdAt_idx" ON "ProductViewEvent"("createdAt");
