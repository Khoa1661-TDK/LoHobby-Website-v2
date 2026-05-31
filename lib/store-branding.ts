// lib/store-branding.ts — white-label branding resolved from CMS + env fallbacks
import {
  BRAND_CONTACT,
  BRAND_DESCRIPTION,
  BRAND_DESCRIPTION_SHORT,
  BRAND_ORIGIN,
  BRAND_TAGLINE,
  DEFAULT_LOGO_URL,
  getSiteName,
} from '@/lib/brand';
import { darkenHex, hexToRgbTriplet, normalizeHexColor } from '@/lib/color-utils';
import { normalizeProductImageUrl } from '@/lib/product-image-snapshot';
import { getStoreSettings, type ResolvedStoreSettings } from '@/lib/store-settings';

export type SocialLink = {
  label: string;
  url: string;
};

export type StoreBranding = {
  storeName: string;
  storeSubtitle: string | null;
  tagline: string;
  origin: string | null;
  description: string;
  descriptionShort: string;
  logoUrl: string;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  primaryColorHover: string;
  accentColor: string;
  footerCredit: string | null;
  socialLinks: SocialLink[];
  contact: {
    email: string;
    phone: string;
    address: string;
  };
};

type MediaLike = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

const DEFAULT_PRIMARY = normalizeHexColor(process.env.NEXT_PUBLIC_BRAND_PRIMARY, '#000000');
const DEFAULT_ACCENT = normalizeHexColor(process.env.NEXT_PUBLIC_BRAND_ACCENT, '#737373');

function resolveMediaUrl(field: unknown): string | null {
  if (typeof field !== 'object' || field === null) return null;
  const url = (field as MediaLike).url;
  if (typeof url !== 'string' || url.trim().length === 0) return null;
  return normalizeProductImageUrl(url);
}

function resolveSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const links: SocialLink[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const record = row as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    if (label.length > 0 && url.length > 0) {
      links.push({ label, url });
    }
  }
  return links;
}

/** Map Payload global + env defaults into a reusable white-label branding object. */
export function resolveStoreBranding(
  settings: ResolvedStoreSettings,
  raw: Record<string, unknown> | null,
): StoreBranding {
  const storeName = settings.storeName || getSiteName();
  const storeSubtitle =
    typeof raw?.storeSubtitle === 'string' && raw.storeSubtitle.trim().length > 0
      ? raw.storeSubtitle.trim()
      : null;
  const tagline = settings.footerTagline || BRAND_TAGLINE;
  const origin =
    typeof raw?.brandOrigin === 'string' && raw.brandOrigin.trim().length > 0
      ? raw.brandOrigin.trim()
      : BRAND_ORIGIN;
  const description =
    typeof raw?.storeDescription === 'string' && raw.storeDescription.trim().length > 0
      ? raw.storeDescription.trim()
      : BRAND_DESCRIPTION;
  const descriptionShort =
    typeof raw?.storeDescriptionShort === 'string' && raw.storeDescriptionShort.trim().length > 0
      ? raw.storeDescriptionShort.trim()
      : BRAND_DESCRIPTION_SHORT;

  const logoUrl =
    resolveMediaUrl(raw?.logo) ??
    (process.env.NEXT_PUBLIC_DEFAULT_LOGO?.trim() || DEFAULT_LOGO_URL);
  const logoDarkUrl = resolveMediaUrl(raw?.logoDark);
  const faviconUrl = resolveMediaUrl(raw?.favicon);

  const primaryColor = normalizeHexColor(
    typeof raw?.primaryColor === 'string' ? raw.primaryColor : null,
    DEFAULT_PRIMARY,
  );
  const accentColor = normalizeHexColor(
    typeof raw?.accentColor === 'string' ? raw.accentColor : null,
    DEFAULT_ACCENT,
  );
  const footerCredit =
    typeof raw?.footerCredit === 'string' && raw.footerCredit.trim().length > 0
      ? raw.footerCredit.trim()
      : process.env.NEXT_PUBLIC_FOOTER_CREDIT?.trim() || null;

  return {
    storeName,
    storeSubtitle,
    tagline,
    origin,
    description,
    descriptionShort,
    logoUrl,
    logoDarkUrl,
    faviconUrl,
    primaryColor,
    primaryColorHover: darkenHex(primaryColor, 12),
    accentColor,
    footerCredit,
    socialLinks: resolveSocialLinks(raw?.socialLinks),
    contact: {
      email: settings.contactEmail || BRAND_CONTACT.email,
      phone: settings.contactPhone || BRAND_CONTACT.phone,
      address: settings.contactAddress || BRAND_CONTACT.address,
    },
  };
}

/** Cached branding for server components, SEO, and layout. */
export async function getStoreBranding(): Promise<StoreBranding> {
  const settings = await getStoreSettings();
  return resolveStoreBranding(settings, settings.brandingRaw);
}

/** CSS custom properties injected by BrandTheme for Tailwind brand tokens. */
export function brandingCssVariables(branding: StoreBranding): Record<string, string> {
  return {
    '--brand-primary': branding.primaryColor,
    '--brand-primary-hover': branding.primaryColorHover,
    '--brand-primary-rgb': hexToRgbTriplet(branding.primaryColor),
    '--brand-accent': branding.accentColor,
    '--brand-accent-rgb': hexToRgbTriplet(branding.accentColor),
  };
}

export function brandingStyleAttribute(
  branding: StoreBranding,
): Record<string, string | number> {
  return brandingCssVariables(branding);
}
