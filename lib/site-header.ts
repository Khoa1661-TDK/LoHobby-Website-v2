// lib/site-header.ts — admin-managed header navigation (resolves the `site-header` Payload global)
import config from '@payload-config';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { getPayloadCollections } from '@/lib/payload-products';
import { logger } from '@/lib/logger';

const SITE_HEADER_TAG = 'site-header';

/** Single tab as rendered by the navbar. */
export type ResolvedHeaderTab =
  | { kind: 'link'; label: string; href: string; external?: boolean }
  | { kind: 'dropdown'; label: string; items: Array<{ label: string; href: string }> };

/** Announcement bar rendered above the navbar. */
export type SiteAnnouncement = {
  text: string;
  href?: string;
  external?: boolean;
  backgroundColor?: string;
  textColor?: string;
};

type RawDropdownItem = {
  label?: string | null;
  category?: { slug?: string | null; title?: string | null } | string | number | null;
};

type RawTab = {
  label?: string | null;
  kind?: 'home' | 'all-products' | 'category' | 'custom' | 'dropdown' | null;
  category?: { slug?: string | null; title?: string | null } | string | number | null;
  href?: string | null;
  showAllCategories?: boolean | null;
  dropdownItems?: RawDropdownItem[] | null;
};

/** Keys for the built-in default tabs that can be individually hidden. */
export type DefaultTabKey = 'home' | 'shop' | 'categories';

type RawAnnouncement = {
  enabled?: boolean | null;
  text?: string | null;
  link?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
};

type RawHeaderGlobal = {
  announcement?: RawAnnouncement | null;
  tabs?: RawTab[] | null;
};

type SiteHeaderData = {
  tabs: ResolvedHeaderTab[];
  announcement: SiteAnnouncement | null;
};

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function parseHexColor(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(trimmed) ? trimmed : undefined;
}

function resolveAnnouncement(raw?: RawAnnouncement | null): SiteAnnouncement | null {
  if (!raw?.enabled) return null;

  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) return null;

  const href = typeof raw.link === 'string' ? raw.link.trim() : '';
  const backgroundColor = parseHexColor(raw.backgroundColor);
  const textColor = parseHexColor(raw.textColor);

  return {
    text,
    ...(href ? { href, external: isExternal(href) } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(textColor ? { textColor } : {}),
  };
}

function categoryHref(slug: string): string {
  return `/search/${slug}`;
}

function pickCategory(value: RawTab['category']): { slug: string; title: string } | null {
  if (!value || typeof value !== 'object') return null;
  const slug = typeof value.slug === 'string' ? value.slug.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  if (!slug) return null;
  return { slug, title: title || slug };
}

async function fetchAllCategories(): Promise<Array<{ slug: string; title: string }>> {
  const collections = await getPayloadCollections();
  return collections
    .filter((c) => c.handle !== '')
    .map((c) => ({ slug: c.handle, title: c.title }));
}

/**
 * Maps a configured tab to the default key it duplicates, so that default can be
 * suppressed (defaults themselves are never deletable — this only avoids duplicates).
 */
function defaultKeyForConfiguredTab(tab: RawTab): DefaultTabKey | null {
  switch (tab.kind) {
    case 'home':
      return 'home';
    case 'all-products':
      return 'shop';
    case 'dropdown':
      return tab.showAllCategories ? 'categories' : null;
    default:
      return null;
  }
}

/**
 * Defaults (Home · Shop · Categories) always appear and cannot be deleted.
 * We only suppress a default when a custom tab already covers the same target,
 * so admins don't end up with a duplicate row.
 */
function collectHiddenDefaults(configuredTabs: RawTab[]): Set<DefaultTabKey> {
  const hidden = new Set<DefaultTabKey>();

  for (const tab of configuredTabs) {
    const key = defaultKeyForConfiguredTab(tab);
    if (key) hidden.add(key);
  }

  return hidden;
}

async function buildDefaultTabs(hidden: Set<DefaultTabKey>): Promise<ResolvedHeaderTab[]> {
  const defaults: ResolvedHeaderTab[] = [];

  if (!hidden.has('home')) {
    defaults.push({ kind: 'link', label: 'Trang chủ', href: '/' });
  }
  if (!hidden.has('shop')) {
    defaults.push({ kind: 'link', label: 'Cửa hàng', href: '/search' });
  }
  if (!hidden.has('categories')) {
    const allCategories = await fetchAllCategories();
    defaults.push({
      kind: 'dropdown',
      label: 'Danh mục',
      items: [
        { label: 'Tất cả sản phẩm', href: '/search' },
        ...allCategories.map((c) => ({ label: c.title, href: categoryHref(c.slug) })),
      ],
    });
  }

  return defaults;
}

async function resolveConfiguredTabs(tabs: RawTab[]): Promise<ResolvedHeaderTab[]> {
  const allCategoriesPromise = fetchAllCategories();
  const resolved: ResolvedHeaderTab[] = [];

  for (const tab of tabs) {
    const label = typeof tab.label === 'string' ? tab.label.trim() : '';
    if (!label) continue;

    switch (tab.kind) {
      case 'home':
        resolved.push({ kind: 'link', label, href: '/' });
        break;
      case 'all-products':
        resolved.push({ kind: 'link', label, href: '/search' });
        break;
      case 'category': {
        const cat = pickCategory(tab.category);
        if (cat) resolved.push({ kind: 'link', label, href: categoryHref(cat.slug) });
        break;
      }
      case 'custom': {
        const href = typeof tab.href === 'string' ? tab.href.trim() : '';
        if (href) {
          resolved.push({ kind: 'link', label, href, external: isExternal(href) });
        }
        break;
      }
      case 'dropdown': {
        let items: Array<{ label: string; href: string }> = [];

        if (tab.showAllCategories) {
          const all = await allCategoriesPromise;
          items = [
            { label: 'Tất cả sản phẩm', href: '/search' },
            ...all.map((c) => ({ label: c.title, href: categoryHref(c.slug) })),
          ];
        } else if (Array.isArray(tab.dropdownItems)) {
          for (const child of tab.dropdownItems) {
            const cat = pickCategory(child?.category);
            if (!cat) continue;
            const childLabel =
              typeof child?.label === 'string' && child.label.trim().length > 0
                ? child.label.trim()
                : cat.title;
            items.push({ label: childLabel, href: categoryHref(cat.slug) });
          }
        }

        if (items.length > 0) resolved.push({ kind: 'dropdown', label, items });
        break;
      }
      default:
        break;
    }
  }

  return resolved;
}

async function fetchSiteHeaderData(): Promise<SiteHeaderData> {
  const payload = await getPayload({ config });
  let raw: RawHeaderGlobal | null = null;

  try {
    const result = await payload.findGlobal({ slug: 'site-header', depth: 2 });
    raw = (result as RawHeaderGlobal) ?? null;
  } catch (error) {
    // Most likely the global hasn't been saved yet (or schema not pushed).
    logger.warn({ err: error }, '[site-header] findGlobal failed; falling back to defaults.');
  }

  const announcement = resolveAnnouncement(raw?.announcement);
  const configuredTabs = Array.isArray(raw?.tabs) ? raw!.tabs.filter((t): t is RawTab => Boolean(t)) : [];
  const hidden = collectHiddenDefaults(configuredTabs);
  const [defaults, resolved] = await Promise.all([
    buildDefaultTabs(hidden),
    resolveConfiguredTabs(configuredTabs),
  ]);

  // Defaults are always present and cannot be deleted; custom tabs follow them.
  return { tabs: [...defaults, ...resolved], announcement };
}

const getSiteHeaderData = unstable_cache(fetchSiteHeaderData, ['site-header-v2'], {
  revalidate: false,
  tags: [SITE_HEADER_TAG, 'catalog', 'collections'],
});

/** Cached resolver consumed by the navbar (server component). */
export async function getSiteHeaderTabs(): Promise<ResolvedHeaderTab[]> {
  return (await getSiteHeaderData()).tabs;
}

/** Cached resolver for the announcement bar below the navbar. */
export async function getSiteAnnouncement(): Promise<SiteAnnouncement | null> {
  return (await getSiteHeaderData()).announcement;
}

/** Flush the header cache after the global is saved or categories change. */
export function revalidateSiteHeaderCache(): void {
  revalidateTag(SITE_HEADER_TAG);
  revalidateTag('catalog');
  revalidateTag('collections');
  revalidatePath('/', 'layout');
}
