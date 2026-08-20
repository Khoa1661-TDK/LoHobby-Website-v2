// lib/console/settings.ts
//
// Settings adapter for the admin console. The reference implementation for a
// Payload-global-backed area.
//
// The mapper takes `unknown` rather than a generated type: the store-settings
// global is a wide, deeply optional generated interface and the console needs
// six fields out of it. Narrowing by hand here keeps the mapper unit-testable
// with a plain object literal.
//
// The global's tabs and collapsibles are unnamed, so storeName, storeSubtitle,
// logo and the three colours all sit at the TOP level of the document — there
// is no `theme` group.

import config from '@payload-config';
import { getPayload } from 'payload';

export type BrandFacts = {
  storeName: string;
  storeSubtitle: string;
  logoUrl: string | null;
  logoAlt: string;
  colors: { primary: string; secondary: string; accent: string };
};

// Matches the defaultValue on each field in src/payload/globals/StoreSettings.ts.
// accentColor is a hidden legacy field with no default, so the console falls
// back to the brand green.
const DEFAULT_COLORS = {
  primary: '#000000',
  secondary: '#737373',
  accent: '#146138',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readColors(doc: Record<string, unknown>): BrandFacts['colors'] {
  return {
    primary: asText(doc.primaryColor, DEFAULT_COLORS.primary),
    secondary: asText(doc.secondaryColor, DEFAULT_COLORS.secondary),
    accent: asText(doc.accentColor, DEFAULT_COLORS.accent),
  };
}

export function toBrandFacts(value: unknown): BrandFacts {
  const doc = asRecord(value);
  // An upload relationship is a populated Media object at depth >= 1 and a bare
  // numeric id at depth 0. Only the object form carries a url.
  const logo = asRecord(doc.logo);

  return {
    storeName: asText(doc.storeName, 'Chưa đặt tên cửa hàng'),
    storeSubtitle: asText(doc.storeSubtitle, 'Chưa có mô tả ngắn'),
    logoUrl: typeof logo.url === 'string' ? logo.url : null,
    logoAlt: asText(logo.alt, ''),
    colors: readColors(doc),
  };
}

export async function getBrandFacts(): Promise<BrandFacts> {
  const payload = await getPayload({ config });
  const doc = await payload.findGlobal({ slug: 'store-settings', depth: 1 });
  return toBrandFacts(doc);
}
