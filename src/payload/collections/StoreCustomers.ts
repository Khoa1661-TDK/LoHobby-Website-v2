// src/payload/collections/StoreCustomers.ts — storefront customer profiles (Phase 3 bridge)
import type { CollectionConfig } from 'payload';
import { groups } from '@/src/payload/groups';
import { payloadAdminAccess } from '@/lib/payload-access';

export const StoreCustomers: CollectionConfig = {
  slug: 'store-customers',
  labels: { singular: 'Store customer', plural: 'Store customers' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'prismaUserId', 'updatedAt'],
    group: groups.customers.name,
    description: 'Linked to Prisma User via prismaUserId — not used for CMS admin login.',
  },
  access: {
    read: payloadAdminAccess,
    create: payloadAdminAccess,
    update: payloadAdminAccess,
    delete: payloadAdminAccess,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'name', type: 'text' },
    {
      name: 'prismaUserId',
      type: 'text',
      index: true,
      admin: { description: 'NextAuth / Prisma User.id' },
    },
    { name: 'phone', type: 'text' },
    { name: 'notes', type: 'textarea' },
  ],
};
