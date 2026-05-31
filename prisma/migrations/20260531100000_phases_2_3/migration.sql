-- Phases 2–3: persisted carts, email campaigns, Payload customer link

ALTER TABLE "User" ADD COLUMN "payloadCustomerId" TEXT;
CREATE UNIQUE INDEX "User_payloadCustomerId_key" ON "User"("payloadCustomerId");

CREATE TABLE "PersistedCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersistedCart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersistedCart_userId_key" ON "PersistedCart"("userId");

ALTER TABLE "PersistedCart" ADD CONSTRAINT "PersistedCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');

CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");
