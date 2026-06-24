// src/payload/collections/Orders.ts — ShopNex-compatible Payload orders (source of truth)
import type { CollectionConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { syncOrderInventoryOnStatusChange, normalizeOrderPaymentOnChange, notifySellerOnNewOrder } from '@/lib/payload-order-hooks';
import { groups } from '@/src/payload/groups';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    group: groups.orders.name,
    useAsTitle: 'orderId',
    defaultColumns: [
      'orderId',
      'totalAmount',
      'paymentStatus',
      'orderStatus',
      'fulfillmentPanel',
      'createdAt',
    ],
    description:
      'Trạng thái đơn được quản lý ở trang "Quản lý đơn hàng" (/admin/orders). Các trường trạng thái ở đây chỉ để xem.',
  },
  access: {
    read: payloadAdminAccess,
    create: payloadAdminAccess,
    update: payloadAdminAccess,
    delete: payloadAdminAccess,
  },
  hooks: {
    beforeChange: [normalizeOrderPaymentOnChange],
    afterChange: [syncOrderInventoryOnStatusChange, notifySellerOnNewOrder],
  },
  fields: [
    {
      name: 'fulfillmentPanel',
      label: 'Xử lý & vận chuyển',
      type: 'ui',
      admin: {
        components: {
          Field: '@/src/payload/components/OrderFulfillmentPanel#OrderFulfillmentPanel',
          Cell: '@/src/payload/components/OrderFulfillmentListCell#OrderFulfillmentListCell',
        },
      },
    },
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
          admin: { readOnly: true },
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
          admin: { readOnly: true },
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
      name: 'cancellationReason',
      type: 'select',
      admin: { readOnly: true, position: 'sidebar' },
      options: [
        { label: 'Đổi ý / không muốn mua nữa', value: 'changed_mind' },
        { label: 'Đặt nhầm', value: 'ordered_by_mistake' },
        { label: 'Tìm được giá tốt hơn', value: 'found_better_price' },
        { label: 'Giao hàng quá chậm', value: 'delivery_too_slow' },
        { label: 'Lý do khác', value: 'other' },
      ],
    },
    {
      name: 'cancellationNote',
      type: 'textarea',
      admin: { readOnly: true, position: 'sidebar' },
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
      name: 'confirmedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'When admin confirmed the order for fulfillment.',
      },
    },
    {
      name: 'shippedAt',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'deliveredAt',
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
      name: 'shippingCarrierKey',
      type: 'select',
      label: 'Carrier',
      options: [
        { label: 'Giao Hàng Nhanh (GHN)', value: 'ghn' },
        { label: 'Giao Hàng Tiết Kiệm (GHTK)', value: 'ghtk' },
        { label: 'Viettel Post', value: 'viettel_post' },
        { label: 'J&T Express', value: 'jt_express' },
        { label: 'SPX Express', value: 'spx' },
        { label: 'VNPost', value: 'vnpost' },
        { label: 'Other', value: 'other' },
      ],
      admin: { description: 'Shipping provider handling this order.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'shippingCarrier',
          type: 'text',
          label: 'Carrier label',
          admin: { description: 'Display name (auto-filled from carrier key).' },
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
      name: 'shipmentStatus',
      type: 'select',
      label: 'Shipment status',
      options: [
        { label: 'Awaiting pickup', value: 'awaiting_pickup' },
        { label: 'Picked up', value: 'picked_up' },
        { label: 'In transit', value: 'in_transit' },
        { label: 'Out for delivery', value: 'out_for_delivery' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: { description: 'Live carrier tracking status (auto-synced).' },
    },
    {
      name: 'shipmentEvents',
      type: 'array',
      label: 'Shipment events',
      admin: { description: 'Tracking timeline from the carrier.' },
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Awaiting pickup', value: 'awaiting_pickup' },
            { label: 'Picked up', value: 'picked_up' },
            { label: 'In transit', value: 'in_transit' },
            { label: 'Out for delivery', value: 'out_for_delivery' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Failed', value: 'failed' },
          ],
        },
        { name: 'message', type: 'text', required: true },
        { name: 'location', type: 'text' },
        { name: 'occurredAt', type: 'date', required: true },
      ],
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
