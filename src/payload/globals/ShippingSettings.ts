// src/payload/globals/ShippingSettings.ts
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { revalidateShippingSettingsCache } from '@/lib/shipping-settings';
import { groups } from '@/src/payload/groups';

const invalidateOnChange: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidateShippingSettingsCache();
  } catch (error) {
    console.error('[shipping-settings.afterChange] revalidate failed:', error);
  }
  return doc;
};

export const ShippingSettings: GlobalConfig = {
  slug: 'shipping-settings',
  label: 'Shipping & pickup',
  admin: {
    description: 'Flat shipping rates, free-shipping threshold, and pickup location for checkout.',
    group: groups.settings.name,
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  hooks: {
    afterChange: [invalidateOnChange],
  },
  fields: [
    {
      name: 'shipmentEnabled',
      type: 'checkbox',
      label: 'Enable home delivery',
      defaultValue: true,
    },
    {
      name: 'flatRateVnd',
      type: 'number',
      label: 'Flat shipping fee (VND)',
      min: 0,
      defaultValue: 30000,
      admin: {
        condition: (_data, sibling) => Boolean(sibling?.shipmentEnabled),
        step: 1000,
        description: 'Added to the order total when delivery method is shipment.',
      },
    },
    {
      name: 'freeShippingThresholdVnd',
      type: 'number',
      label: 'Free shipping from (VND subtotal)',
      min: 0,
      defaultValue: 0,
      admin: {
        condition: (_data, sibling) => Boolean(sibling?.shipmentEnabled),
        step: 10000,
        description: '0 = no free-shipping rule. Subtotal is before discount.',
      },
    },
    {
      name: 'pickupEnabled',
      type: 'checkbox',
      label: 'Enable store pickup',
      defaultValue: true,
    },
    {
      name: 'pickupAddress',
      type: 'textarea',
      label: 'Pickup address',
      defaultValue: 'Trụ sở Lô Hobby, TP. Hồ Chí Minh, Việt Nam',
      admin: {
        condition: (_data, sibling) => Boolean(sibling?.pickupEnabled),
      },
    },
    {
      name: 'pickupInstructions',
      type: 'textarea',
      label: 'Pickup instructions',
      admin: {
        condition: (_data, sibling) => Boolean(sibling?.pickupEnabled),
        description: 'Shown on checkout when customer selects pickup.',
      },
    },
    {
      name: 'zones',
      type: 'array',
      label: 'Shipping zones',
      admin: {
        description:
          'Optional regional rates. Match keywords against the city/province from the customer address (e.g. "Hồ Chí Minh, HCM, TP.HCM"). Falls back to flat rate when no zone matches.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Zone name',
        },
        {
          name: 'regionKeywords',
          type: 'textarea',
          required: true,
          label: 'Region keywords',
          admin: {
            description: 'Comma-separated city/province keywords to match (case-insensitive).',
          },
        },
        {
          name: 'flatRateVnd',
          type: 'number',
          label: 'Shipping fee (VND)',
          min: 0,
          defaultValue: 30000,
          admin: { step: 1000 },
        },
        {
          name: 'freeShippingThresholdVnd',
          type: 'number',
          label: 'Free shipping from (VND subtotal)',
          min: 0,
          defaultValue: 0,
          admin: { step: 10000 },
        },
      ],
    },
  ],
};
