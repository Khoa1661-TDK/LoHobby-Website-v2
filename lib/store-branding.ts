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
import { fontCssVariables, resolveFontPreset, type FontPreset } from '@/lib/store-fonts';
import { normalizeProductImageUrl } from '@/lib/product-image-snapshot';
import { getStoreSettings, type ResolvedStoreSettings } from '@/lib/store-settings';

export type SocialLink = {
  label: string;
  url: string;
};

export type HeroBannerSettings = {
  enabled: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
  showCarousel: boolean;
  carouselTitle: string;
};

export type FooterSettings = {
  tagline: string;
  description: string;
  origin: string | null;
  credit: string | null;
  showNewsletter: boolean;
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
  /** True when a logo image was uploaded in the CMS; false when falling back
   *  to the default. The navbar/footer render the Playfair wordmark instead of
   *  the fallback image when this is false. */
  hasCustomLogo: boolean;
  faviconUrl: string | null;
  primaryColor: string;
  primaryColorHover: string;
  /** Secondary brand color (buttons accents, badges). */
  secondaryColor: string;
  /** @deprecated Use secondaryColor */
  accentColor: string;
  fontPreset: FontPreset;
  hero: HeroBannerSettings;
  footer: FooterSettings;
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
};

// Lô Hobby redesign-3 defaults to brand blue. CMS Store Settings still override
// these; the env vars win over the hardcoded fallback when set.
const DEFAULT_PRIMARY = normalizeHexColor(process.env.NEXT_PUBLIC_BRAND_PRIMARY, '#1f6feb');
const DEFAULT_SECONDARY = normalizeHexColor(
  process.env.NEXT_PUBLIC_BRAND_SECONDARY ?? process.env.NEXT_PUBLIC_BRAND_ACCENT,
  '#0b3ea8',
);

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

function resolveHero(raw: Record<string, unknown> | null, storeName: string, tagline: string): HeroBannerSettings {
  const eyebrow =
    typeof raw?.heroEyebrow === 'string' && raw.heroEyebrow.trim().length > 0
      ? raw.heroEyebrow.trim()
      : null;
  const title =
    typeof raw?.heroTitle === 'string' && raw.heroTitle.trim().length > 0
      ? raw.heroTitle.trim()
      : null;
  const subtitle =
    typeof raw?.heroSubtitle === 'string' && raw.heroSubtitle.trim().length > 0
      ? raw.heroSubtitle.trim()
      : tagline;
  const ctaLabel =
    typeof raw?.heroCtaLabel === 'string' && raw.heroCtaLabel.trim().length > 0
      ? raw.heroCtaLabel.trim()
      : 'Shop now';
  const ctaUrl =
    typeof raw?.heroCtaUrl === 'string' && raw.heroCtaUrl.trim().length > 0
      ? raw.heroCtaUrl.trim()
      : '/search';
  const carouselTitle =
    typeof raw?.heroCarouselTitle === 'string' && raw.heroCarouselTitle.trim().length > 0
      ? raw.heroCarouselTitle.trim()
      : 'New arrivals';

  return {
    enabled: raw?.heroEnabled !== false,
    eyebrow,
    title: title ?? storeName,
    subtitle,
    ctaLabel,
    ctaUrl,
    imageUrl: resolveMediaUrl(raw?.heroImage),
    showCarousel: raw?.heroShowCarousel !== false,
    carouselTitle,
  };
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
      : BRAND_ORIGIN || null;
  const description =
    typeof raw?.storeDescription === 'string' && raw.storeDescription.trim().length > 0
      ? raw.storeDescription.trim()
      : BRAND_DESCRIPTION;
  const descriptionShort =
    typeof raw?.storeDescriptionShort === 'string' && raw.storeDescriptionShort.trim().length > 0
      ? raw.storeDescriptionShort.trim()
      : BRAND_DESCRIPTION_SHORT;

  const customLogo = resolveMediaUrl(raw?.logo);
  const envLogo = process.env.NEXT_PUBLIC_DEFAULT_LOGO?.trim() || null;
  const logoUrl = customLogo ?? envLogo ?? DEFAULT_LOGO_URL;
  const logoDarkUrl = resolveMediaUrl(raw?.logoDark);
  // True when a real logo image exists (CMS upload or explicit env default).
  // When only the bundled placeholder remains, the navbar renders the Lô Hobby
  // Playfair wordmark instead.
  const hasCustomLogo = customLogo !== null || envLogo !== null;
  const faviconUrl = resolveMediaUrl(raw?.favicon);

  const primaryColor = normalizeHexColor(
    typeof raw?.primaryColor === 'string' ? raw.primaryColor : null,
    DEFAULT_PRIMARY,
  );
  const secondaryColor = normalizeHexColor(
    typeof raw?.secondaryColor === 'string'
      ? raw.secondaryColor
      : typeof raw?.accentColor === 'string'
        ? raw.accentColor
        : null,
    DEFAULT_SECONDARY,
  );
  const footerCredit =
    typeof raw?.footerCredit === 'string' && raw.footerCredit.trim().length > 0
      ? raw.footerCredit.trim()
      : process.env.NEXT_PUBLIC_FOOTER_CREDIT?.trim() || null;

  const footerDescription =
    typeof raw?.footerDescription === 'string' && raw.footerDescription.trim().length > 0
      ? raw.footerDescription.trim()
      : descriptionShort;

  const fontPreset = resolveFontPreset(raw?.fontPreset);
  const hero = resolveHero(raw, storeName, tagline);

  return {
    storeName,
    storeSubtitle,
    tagline,
    origin,
    description,
    descriptionShort,
    logoUrl,
    logoDarkUrl,
    hasCustomLogo,
    faviconUrl,
    primaryColor,
    primaryColorHover: darkenHex(primaryColor, 12),
    secondaryColor,
    accentColor: secondaryColor,
    fontPreset,
    hero,
    footer: {
      tagline,
      description: footerDescription,
      origin,
      credit: footerCredit,
      showNewsletter: raw?.footerShowNewsletter !== false,
    },
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
    ...fontCssVariables(branding.fontPreset),
    '--brand-primary': branding.primaryColor,
    '--brand-primary-hover': branding.primaryColorHover,
    '--brand-primary-rgb': hexToRgbTriplet(branding.primaryColor),
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.secondaryColor,
    '--brand-secondary-rgb': hexToRgbTriplet(branding.secondaryColor),
    '--brand-accent-rgb': hexToRgbTriplet(branding.secondaryColor),
  };
}
