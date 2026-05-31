-- Phase 1: shipping, coupons, variant line items, inventory tracking on orders

CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "CouponDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

ALTER TABLE "Order" ADD COLUMN "subtotalAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "inventoryAdjusted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrderItem" ADD COLUMN "variantSku" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;

-- Backfill subtotal for existing orders (amount was line-items only before shipping/discount)
UPDATE "Order" SET "subtotalAmount" = "amount" WHERE "subtotalAmount" IS NULL;
