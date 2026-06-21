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

  const payload = await getPayload({ config });

  // Trust the cached pointer only if the store-customer row still exists.
  // Payload's tables can be reset/reseeded independently of the Prisma users
  // table (e.g. `payload schema push` on deploy), leaving a dangling
  // payloadCustomerId. Returning it blindly inserts an order with a
  // non-existent customer_id → foreign-key violation at checkout.
  if (user.payloadCustomerId) {
    const cached = await payload
      .findByID({ collection: 'store-customers', id: user.payloadCustomerId, depth: 0 })
      .catch(() => null);
    if (cached?.id) {
      return user.payloadCustomerId;
    }
  }

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
