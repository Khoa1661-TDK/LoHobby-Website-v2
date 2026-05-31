// src/payload/collections/Carts.ts — ShopNex-style Payload carts
import type { CollectionConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { groups } from '@/src/payload/groups';
import { createCartSession, updateCartSession } from './Carts/endpoints/cart-session';

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
  endpoints: [createCartSession, updateCartSession],
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
