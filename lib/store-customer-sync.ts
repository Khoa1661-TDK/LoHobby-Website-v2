// lib/store-customer-sync.ts — bridge NextAuth Prisma users ↔ Payload store-customers (Phase 3)
import config from '@payload-config';
import { getPayload } from 'payload';
import { isStoreCustomerSyncEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

export async function syncStoreCustomerForUser(userId: string): Promise<string | null> {
  if (!isStoreCustomerSyncEnabled()) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, payloadCustomerId: true },
  });
  if (!user?.email) return null;

  if (user.payloadCustomerId) {
    return user.payloadCustomerId;
  }

  const payload = await getPayload({ config });
  const existing = await payload.find({
    collection: 'store-customers',
    where: { email: { equals: user.email.trim().toLowerCase() } },
    limit: 1,
    pagination: false,
    depth: 0,
  });

  let customerId: string | number;
  const doc = existing.docs[0];
  if (doc?.id) {
    customerId = doc.id;
    await payload.update({
      collection: 'store-customers',
      id: doc.id,
      data: {
        name: user.name,
        prismaUserId: user.id,
      },
    });
  } else {
    const created = await payload.create({
      collection: 'store-customers',
      data: {
        email: user.email.trim().toLowerCase(),
        name: user.name,
        prismaUserId: user.id,
      },
    });
    customerId = created.id;
  }

  const payloadCustomerId = String(customerId);
  await prisma.user.update({
    where: { id: user.id },
    data: { payloadCustomerId },
  });

  return payloadCustomerId;
}
