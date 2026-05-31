// lib/dropshipping/settings.ts
import config from '@payload-config';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { isDropshippingEnabled } from '@/lib/feature-flags';

export type DropshipSettings = {
  enabled: boolean;
  provider: 'cj' | 'manual';
  apiKeyConfigured: boolean;
  autoSubmitOnPaid: boolean;
  note: string | null;
};

const DEFAULTS: DropshipSettings = {
  enabled: false,
  provider: 'cj',
  apiKeyConfigured: false,
  autoSubmitOnPaid: false,
  note: null,
};

async function fetchSettings(): Promise<DropshipSettings> {
  if (!isDropshippingEnabled()) return DEFAULTS;

  const payload = await getPayload({ config });
  try {
    const raw = await payload.findGlobal({ slug: 'dropship-settings' });
    const apiKey =
      typeof (raw as { apiKey?: string }).apiKey === 'string'
        ? (raw as { apiKey: string }).apiKey.trim()
        : '';
    return {
      enabled: (raw as { enabled?: boolean }).enabled === true,
      provider:
        (raw as { provider?: string }).provider === 'manual' ? 'manual' : 'cj',
      apiKeyConfigured: apiKey.length > 0,
      autoSubmitOnPaid: (raw as { autoSubmitOnPaid?: boolean }).autoSubmitOnPaid === true,
      note:
        typeof (raw as { note?: string }).note === 'string' &&
        (raw as { note: string }).note.trim().length > 0
          ? (raw as { note: string }).note.trim()
          : null,
    };
  } catch {
    return DEFAULTS;
  }
}

const getCached = unstable_cache(fetchSettings, ['dropship-settings'], {
  revalidate: 60,
});

export async function getDropshipSettings(): Promise<DropshipSettings> {
  return getCached();
}
