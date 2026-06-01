// lib/shipping-settings.ts — Payload global `shipping-settings` for checkout totals

import config from '@payload-config';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

import { getPayload } from 'payload';

import {

  computeShippingQuote,

  extractShippingRegion,

  type ShippingQuote,

  type ShippingZone,

} from '@/lib/shipping-quote';



export type { ShippingQuote, ShippingZone };

export { computeShippingQuote, extractShippingRegion };



const SHIPPING_SETTINGS_TAG = 'shipping-settings';



export type ResolvedShippingSettings = {

  shipmentEnabled: boolean;

  flatRateVnd: number;

  freeShippingThresholdVnd: number;

  pickupEnabled: boolean;

  pickupAddress: string;

  pickupInstructions: string | null;

  zones: ShippingZone[];

};



type RawShippingZone = {

  name?: string | null;

  regionKeywords?: string | null;

  flatRateVnd?: number | null;

  freeShippingThresholdVnd?: number | null;

};



type RawShippingSettings = {

  shipmentEnabled?: boolean | null;

  flatRateVnd?: number | null;

  freeShippingThresholdVnd?: number | null;

  pickupEnabled?: boolean | null;

  pickupAddress?: string | null;

  pickupInstructions?: string | null;

  zones?: RawShippingZone[] | null;

};



const DEFAULT_PICKUP = 'Trụ sở Lô Hobby, TP. Hồ Chí Minh, Việt Nam';



const DEFAULTS: ResolvedShippingSettings = {

  shipmentEnabled: true,

  flatRateVnd: 30_000,

  freeShippingThresholdVnd: 0,

  pickupEnabled: true,

  pickupAddress: DEFAULT_PICKUP,

  pickupInstructions: null,

  zones: [],

};



function coerceVnd(value: unknown, fallback: number): number {

  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;

  return Math.max(0, Math.round(value));

}



function parseRegionKeywords(raw: string | null | undefined): string[] {

  if (typeof raw !== 'string' || raw.trim().length === 0) return [];

  return raw

    .split(',')

    .map((part) => part.trim().toLowerCase())

    .filter((part) => part.length > 0);

}



function resolveZones(raw: RawShippingZone[] | null | undefined): ShippingZone[] {

  if (!Array.isArray(raw)) return [];

  const zones: ShippingZone[] = [];

  for (const row of raw) {

    const name = typeof row?.name === 'string' ? row.name.trim() : '';

    const keywords = parseRegionKeywords(row?.regionKeywords ?? null);

    if (name.length === 0 || keywords.length === 0) continue;

    zones.push({

      name,

      regionKeywords: keywords,

      flatRateVnd: coerceVnd(row?.flatRateVnd, DEFAULTS.flatRateVnd),

      freeShippingThresholdVnd: coerceVnd(row?.freeShippingThresholdVnd, 0),

    });

  }

  return zones;

}



function resolve(raw: RawShippingSettings | null): ResolvedShippingSettings {

  return {

    shipmentEnabled: raw?.shipmentEnabled !== false,

    flatRateVnd: coerceVnd(raw?.flatRateVnd, DEFAULTS.flatRateVnd),

    freeShippingThresholdVnd: coerceVnd(

      raw?.freeShippingThresholdVnd,

      DEFAULTS.freeShippingThresholdVnd,

    ),

    pickupEnabled: raw?.pickupEnabled !== false,

    pickupAddress:

      typeof raw?.pickupAddress === 'string' && raw.pickupAddress.trim().length > 0

        ? raw.pickupAddress.trim()

        : DEFAULTS.pickupAddress,

    pickupInstructions:

      typeof raw?.pickupInstructions === 'string' && raw.pickupInstructions.trim().length > 0

        ? raw.pickupInstructions.trim()

        : null,

    zones: resolveZones(raw?.zones),

  };

}



async function fetchShippingSettings(): Promise<ResolvedShippingSettings> {

  const payload = await getPayload({ config });

  try {

    const result = await payload.findGlobal({ slug: 'shipping-settings' });

    return resolve((result as RawShippingSettings) ?? null);

  } catch (error) {

    console.warn('[shipping-settings] findGlobal failed; using defaults.', error);

    return DEFAULTS;

  }

}



const getCachedShippingSettings = unstable_cache(

  fetchShippingSettings,

  ['shipping-settings-v2'],

  { revalidate: false, tags: [SHIPPING_SETTINGS_TAG] },

);



export async function getShippingSettings(): Promise<ResolvedShippingSettings> {

  return getCachedShippingSettings();

}



export function revalidateShippingSettingsCache(): void {

  revalidateTag(SHIPPING_SETTINGS_TAG);

  revalidatePath('/checkout');

}

