-- AlterEnum: introduce the SHIPPED state used by the order portal
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

-- AlterTable: link orders back to their buyer when authenticated
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateTable: persistent shipping profile for repeat customers
CREATE TABLE IF NOT EXISTS "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "ward" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Vietnam',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserAddress_userId_idx" ON "UserAddress"("userId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "UserAddress"
        ADD CONSTRAINT "UserAddress_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Order"
        ADD CONSTRAINT "Order_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
