// lib/brand.ts — env-based brand fallbacks (override via CMS Store Settings for production)
export const BRAND_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'My Store';
export const BRAND_NAME_FULL = process.env.NEXT_PUBLIC_SITE_NAME_FULL ?? BRAND_NAME;
export const BRAND_TAGLINE =
  process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? 'Quality products, fast delivery';
export const BRAND_ORIGIN = process.env.NEXT_PUBLIC_BRAND_ORIGIN ?? '';

export const BRAND_DESCRIPTION =
  process.env.NEXT_PUBLIC_BRAND_DESCRIPTION ??
  'Online store powered by a flexible Next.js e-commerce platform.';

export const BRAND_DESCRIPTION_SHORT =
  process.env.NEXT_PUBLIC_BRAND_DESCRIPTION_SHORT ??
  'Shop online with secure checkout and order tracking.';

export const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO?.trim() || '/brand/lo-logo.png';

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME ?? BRAND_NAME;
}

export const BRAND_CONTACT = {
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? '123 Main Street, City, Country',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '+1 000 000 0000',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@example.com',
};

/** Default social links when none are configured in admin. */
export const DEFAULT_SOCIAL_LINKS = [
  { label: 'Facebook', url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? 'https://facebook.com/' },
  { label: 'Instagram', url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? 'https://instagram.com/' },
  { label: 'YouTube', url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? 'https://youtube.com/' },
].filter((link) => link.url.length > 0);
