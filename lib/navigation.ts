// lib/navigation.ts — admin-managed footer & mobile navigation (resolves the `navigation` Payload global)
import config from '@payload-config';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { logger } from '@/lib/logger';

const NAVIGATION_TAG = 'navigation';

/** A single resolved link inside a navigation column. */
export type NavLink = {
  label: string;
  href: string;
  /** Open in a new tab (also implies rel="noopener noreferrer"). */
  external: boolean;
};

/** A column of links under a heading — the building block for footer & mobile menus. */
export type NavColumn = {
  heading: string;
  links: NavLink[];
};

type RawLink = {
  label?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
};

type RawColumn = {
  heading?: string | null;
  links?: RawLink[] | null;
};

type RawNavigationGlobal = {
  footerMenu?: RawColumn[] | null;
  mobileMenu?: RawColumn[] | null;
};

type NavigationData = {
  footerMenu: NavColumn[];
  mobileMenu: NavColumn[];
};

/**
 * Defaults preserve the storefront's prior hardcoded footer/mobile links so the
 * menus never render empty before an admin populates the `navigation` global.
 * Mirrors the `site-header` "include defaults" philosophy.
 */
const DEFAULT_FOOTER_MENU: NavColumn[] = [
  {
    heading: 'Hỗ trợ',
    links: [
      { label: 'Về chúng tôi', href: '/about', external: false },
      { label: 'Liên hệ', href: '/contact', external: false },
      { label: 'Câu hỏi thường gặp', href: '/faq', external: false },
      { label: 'Trung tâm hỗ trợ', href: '/info/support', external: false },
      { label: 'Cách đặt hàng', href: '/info/how-to-order', external: false },
      { label: 'Hướng dẫn thanh toán', href: '/info/payment', external: false },
      { label: 'Đổi trả', href: '/info/returns', external: false },
      { label: 'Theo dõi đơn hàng', href: '/info/track-order', external: false },
    ],
  },
  {
    heading: 'Chính sách',
    links: [
      { label: 'Chính sách cookie', href: '/info/cookies', external: false },
      { label: 'Chính sách bảo mật', href: '/info/privacy', external: false },
      { label: 'Điều khoản dịch vụ', href: '/info/terms', external: false },
    ],
  },
];

const DEFAULT_MOBILE_MENU: NavColumn[] = [
  {
    heading: 'Khám phá',
    links: [
      { label: 'Trang chủ', href: '/', external: false },
      { label: 'Cửa hàng', href: '/search', external: false },
      { label: 'Danh mục', href: '/search', external: false },
    ],
  },
  {
    heading: 'Hỗ trợ',
    links: [
      { label: 'Liên hệ', href: '/contact', external: false },
      { label: 'Câu hỏi thường gặp', href: '/faq', external: false },
      { label: 'Theo dõi đơn hàng', href: '/info/track-order', external: false },
    ],
  },
];

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function resolveLink(raw: RawLink | null | undefined): NavLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const href = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!label || !href) return null;
  return {
    label,
    href,
    external: Boolean(raw.openInNewTab) || isExternal(href),
  };
}

function resolveColumns(raw: RawColumn[] | null | undefined): NavColumn[] {
  if (!Array.isArray(raw)) return [];
  const columns: NavColumn[] = [];

  for (const column of raw) {
    const heading = typeof column?.heading === 'string' ? column.heading.trim() : '';
    if (!heading) continue;
    const links = Array.isArray(column?.links)
      ? column.links.map(resolveLink).filter((l): l is NavLink => l !== null)
      : [];
    if (links.length === 0) continue;
    columns.push({ heading, links });
  }

  return columns;
}

async function fetchNavigationData(): Promise<NavigationData> {
  const payload = await getPayload({ config });
  let raw: RawNavigationGlobal | null = null;

  try {
    const result = await payload.findGlobal({ slug: 'navigation', depth: 0 });
    raw = (result as RawNavigationGlobal) ?? null;
  } catch (error) {
    // Most likely the global hasn't been saved yet (or schema not pushed).
    logger.warn({ err: error }, '[navigation] findGlobal failed; falling back to defaults.');
  }

  const footerMenu = resolveColumns(raw?.footerMenu);
  const mobileMenu = resolveColumns(raw?.mobileMenu);

  return {
    footerMenu: footerMenu.length > 0 ? footerMenu : DEFAULT_FOOTER_MENU,
    mobileMenu: mobileMenu.length > 0 ? mobileMenu : DEFAULT_MOBILE_MENU,
  };
}

const getNavigationData = unstable_cache(fetchNavigationData, ['navigation-v1'], {
  revalidate: false,
  tags: [NAVIGATION_TAG],
});

/** Cached resolver for the footer link columns (server component). */
export async function getFooterMenu(): Promise<NavColumn[]> {
  return (await getNavigationData()).footerMenu;
}

/** Cached resolver for the mobile-menu link columns (server component). */
export async function getMobileMenu(): Promise<NavColumn[]> {
  return (await getNavigationData()).mobileMenu;
}

/** Flush the navigation cache after the `navigation` global is saved. */
export function revalidateNavigationCache(): void {
  revalidateTag(NAVIGATION_TAG);
  revalidatePath('/', 'layout');
}
