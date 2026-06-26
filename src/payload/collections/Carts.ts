// src/payload/collections/Carts.ts — ShopNex-style Payload carts
//
// NOTE: the storefront does NOT persist carts here — live carts live in an
// httpOnly cookie + the Prisma `PersistedCart` table (see lib/cart.ts). This
// collection is currently unused by the app; it is kept only because the
// `orders.cart` relationship still points at it. Fully removing it requires a
// Payload migration to drop this table and that relationship.
import type { CollectionConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { groups } from '@/src/payload/groups';

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    group: groups.customers.name,
    useAsTitle: 'sessionId',
    defaultColumns: ['sessionId', 'completed', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: payloadAdminAccess,
  },
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'store-customers',
      admin: { position: 'sidebar' },
    },
    {
      name: 'cartItems',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'variantId',
          type: 'text',
          required: true,
          admin: { description: 'Variant SKU or product id when no variants.' },
        },
        { name: 'quantity', type: 'number', required: true, min: 1 },
      ],
    },
    {
      name: 'completed',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
  ],
};
