// lib/store-settings.ts — Payload global `store-settings` for storefront + SEO
import config from '@payload-config';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { BRAND_CONTACT, BRAND_TAGLINE, getSiteName } from '@/lib/brand';

const STORE_SETTINGS_TAG = 'store-settings';

export type ResolvedStoreSettings = {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  currencyCode: string;
  footerTagline: string;
  checkoutNote: string | null;
  returnsPolicyUrl: string | null;
  privacyPolicyUrl: string | null;
  taxEnabled: boolean;
  taxRatePercent: number;
  /** Raw branding fields from Payload for resolveStoreBranding(). */
  brandingRaw: Record<string, unknown> | null;
};

export type ChatConfig = {
  enabled: boolean;
  zalo: { enabled: boolean; oaId: string; welcomeMessage: string } | null;
  messenger: {
    enabled: boolean;
    pageId: string;
    themeColor: string;
    greeting: string;
  } | null;
};

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Pure: normalize the raw Live-chat fields into a ChatConfig. */
export function resolveChatConfig(raw: RawStoreSettings | null): ChatConfig {
  const enabled = raw?.chatEnabled === true;

  const oaId = cleanString(raw?.zaloOaId);
  const zalo =
    raw?.zaloChatEnabled === true && oaId.length > 0
      ? { enabled: true, oaId, welcomeMessage: cleanString(raw?.zaloWelcomeMessage) }
      : null;

  const pageId = cleanString(raw?.fbPageId);
  const messenger =
    raw?.messengerChatEnabled === true && pageId.length > 0
      ? {
          enabled: true,
          pageId,
          themeColor: cleanString(raw?.messengerThemeColor),
          greeting: cleanString(raw?.messengerGreeting),
        }
      : null;

  return { enabled, zalo, messenger };
}

type RawStoreSettings = {
  storeName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  currencyCode?: string | null;
  footerTagline?: string | null;
  checkoutNote?: string | null;
  returnsPolicyUrl?: string | null;
  privacyPolicyUrl?: string | null;
  taxEnabled?: boolean | null;
  taxRatePercent?: number | null;
  storeSubtitle?: string | null;
  brandOrigin?: string | null;
  storeDescription?: string | null;
  storeDescriptionShort?: string | null;
  logo?: unknown;
  logoDark?: unknown;
  favicon?: unknown;
  primaryColor?: string | null;
  accentColor?: string | null;
  footerCredit?: string | null;
  socialLinks?: unknown;
  chatEnabled?: boolean | null;
  zaloChatEnabled?: boolean | null;
  zaloOaId?: string | null;
  zaloWelcomeMessage?: string | null;
  messengerChatEnabled?: boolean | null;
  fbPageId?: string | null;
  messengerThemeColor?: string | null;
  messengerGreeting?: string | null;
};

const DEFAULTS: ResolvedStoreSettings = {
  storeName: getSiteName(),
  contactEmail: BRAND_CONTACT.email,
  contactPhone: BRAND_CONTACT.phone,
  contactAddress: BRAND_CONTACT.address,
  currencyCode: 'VND',
  footerTagline: BRAND_TAGLINE,
  checkoutNote: null,
  returnsPolicyUrl: null,
  privacyPolicyUrl: null,
  taxEnabled: false,
  taxRatePercent: 10,
  brandingRaw: null,
};

function resolve(raw: RawStoreSettings | null): ResolvedStoreSettings {
  const storeName =
    typeof raw?.storeName === 'string' && raw.storeName.trim().length > 0
      ? raw.storeName.trim()
      : DEFAULTS.storeName;
  const contactEmail =
    typeof raw?.contactEmail === 'string' && raw.contactEmail.trim().length > 0
      ? raw.contactEmail.trim()
      : DEFAULTS.contactEmail;
  const contactPhone =
    typeof raw?.contactPhone === 'string' && raw.contactPhone.trim().length > 0
      ? raw.contactPhone.trim()
      : DEFAULTS.contactPhone;
  const contactAddress =
    typeof raw?.contactAddress === 'string' && raw.contactAddress.trim().length > 0
      ? raw.contactAddress.trim()
      : DEFAULTS.contactAddress;
  const currencyCode =
    typeof raw?.currencyCode === 'string' && raw.currencyCode.trim().length > 0
      ? raw.currencyCode.trim().toUpperCase()
      : DEFAULTS.currencyCode;
  const footerTagline =
    typeof raw?.footerTagline === 'string' && raw.footerTagline.trim().length > 0
      ? raw.footerTagline.trim()
      : DEFAULTS.footerTagline;
  const checkoutNote =
    typeof raw?.checkoutNote === 'string' && raw.checkoutNote.trim().length > 0
      ? raw.checkoutNote.trim()
      : null;
  const returnsPolicyUrl =
    typeof raw?.returnsPolicyUrl === 'string' && raw.returnsPolicyUrl.trim().length > 0
      ? raw.returnsPolicyUrl.trim()
      : null;
  const privacyPolicyUrl =
    typeof raw?.privacyPolicyUrl === 'string' && raw.privacyPolicyUrl.trim().length > 0
      ? raw.privacyPolicyUrl.trim()
      : null;
  const taxEnabled = raw?.taxEnabled === true;
  const taxRatePercent =
    typeof raw?.taxRatePercent === 'number' && Number.isFinite(raw.taxRatePercent)
      ? Math.min(100, Math.max(0, Math.round(raw.taxRatePercent)))
      : DEFAULTS.taxRatePercent;

  return {
    storeName,
    contactEmail,
    contactPhone,
    contactAddress,
    currencyCode,
    footerTagline,
    checkoutNote,
    returnsPolicyUrl,
    privacyPolicyUrl,
    taxEnabled,
    taxRatePercent,
    brandingRaw: raw ? { ...raw } : null,
  };
}

async function fetchStoreSettings(): Promise<ResolvedStoreSettings> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.findGlobal({ slug: 'store-settings' });
    return resolve((result as RawStoreSettings) ?? null);
  } catch (error) {
    console.warn('[store-settings] findGlobal failed; using defaults.', error);
    return DEFAULTS;
  }
}

const getCachedStoreSettings = unstable_cache(fetchStoreSettings, ['store-settings-v4'], {
  revalidate: false,
  tags: [STORE_SETTINGS_TAG],
});

export async function getStoreSettings(): Promise<ResolvedStoreSettings> {
  return getCachedStoreSettings();
}

/** Prefer CMS store name over env when resolving SEO titles. */
export async function getResolvedSiteName(): Promise<string> {
  const settings = await getStoreSettings();
  return settings.storeName;
}

export function revalidateStoreSettingsCache(): void {
  revalidateTag(STORE_SETTINGS_TAG);
  revalidatePath('/', 'layout');
}
