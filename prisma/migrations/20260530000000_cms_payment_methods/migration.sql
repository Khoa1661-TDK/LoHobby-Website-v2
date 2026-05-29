-- AlterEnum: add the manual bank-transfer pending state used by CMS-managed methods
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_TRANSFER';

-- AlterTable: record the CMS payment method key + processing kind on each order.
-- The legacy "paymentMethod" enum is retained for backward compatibility.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethodKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentKind" TEXT;
