// src/payload/collections/Orders.ts — ShopNex-compatible Payload orders (source of truth)
import type { CollectionConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { syncOrderInventoryOnStatusChange } from '@/lib/payload-order-hooks';
import { groups } from '@/src/payload/groups';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    group: groups.orders.name,
    useAsTitle: 'orderId',
    defaultColumns: ['orderId', 'totalAmount', 'paymentStatus', 'orderStatus', 'createdAt'],
    description: 'Canonical orders (ShopNex admin + analytics). VND integers.',
  },
  access: {
    read: payloadAdminAccess,
    create: payloadAdminAccess,
    update: payloadAdminAccess,
    delete: payloadAdminAccess,
  },
  hooks: {
    afterChange: [syncOrderInventoryOnStatusChange],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'orderId',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { readOnly: true, description: 'Numeric order code as string.' },
        },
        {
          name: 'totalAmount',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Total charged (VND).' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'subtotalAmount',
          type: 'number',
          min: 0,
        },
        {
          name: 'shippingAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
        },
        {
          name: 'discountAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
        },
        {
          name: 'taxAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          admin: { description: 'VAT/sales tax (VND).' },
        },
        {
          name: 'giftCardAmount',
          type: 'number',
          min: 0,
          defaultValue: 0,
          admin: { description: 'Amount applied from a gift card (VND).' },
        },
      ],
    },
    {
      name: 'couponCode',
      type: 'text',
    },
    {
      name: 'giftCardCode',
      type: 'text',
      admin: { description: 'Gift card code redeemed on this order.' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'VND',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'store-customers',
    },
    {
      name: 'cart',
      type: 'relationship',
      relationTo: 'carts',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'paymentStatus',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Paid', value: 'paid' },
            { label: 'Failed', value: 'failed' },
            { label: 'Refunded', value: 'refunded' },
          ],
        },
        {
          name: 'orderStatus',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Processing', value: 'processing' },
            { label: 'Shipped', value: 'shipped' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Canceled', value: 'canceled' },
          ],
        },
      ],
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      options: [
        { label: 'Shipment', value: 'SHIPMENT' },
        { label: 'Pickup', value: 'PICKUP' },
      ],
    },
    {
      name: 'paymentMethodKey',
      type: 'text',
      admin: { position: 'sidebar' },
    },
    {
      name: 'paymentKind',
      type: 'text',
      admin: { position: 'sidebar' },
    },
    {
      name: 'customerName',
      type: 'text',
    },
    {
      name: 'buyerEmail',
      type: 'email',
    },
    {
      name: 'phoneNumber',
      type: 'text',
    },
    {
      name: 'paymentUrl',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'paidAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'inventoryAdjusted',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'lineItems',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        { name: 'productId', type: 'text', required: true },
        { name: 'productTitle', type: 'text' },
        { name: 'productHandle', type: 'text' },
        { name: 'variantSku', type: 'text' },
        { name: 'variantName', type: 'text' },
        { name: 'quantity', type: 'number', required: true },
        { name: 'unitPrice', type: 'number', required: true },
      ],
    },
    {
      name: 'shippingAddress',
      type: 'textarea',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'shippingCarrier',
          type: 'text',
          label: 'Carrier',
          admin: { description: 'e.g. GHN, GHTK, Viettel Post' },
        },
        {
          name: 'trackingNumber',
          type: 'text',
          label: 'Tracking number',
        },
      ],
    },
    {
      name: 'trackingUrl',
      type: 'text',
      label: 'Tracking URL',
      admin: { description: 'Public link for the customer to track shipment.' },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'prismaUserId, legacy ids, gateway refs.',
      },
    },
  ],
};
