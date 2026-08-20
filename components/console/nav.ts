// components/console/nav.ts
//
// Navigation data for the custom admin console. Pure data — no JSX. The
// `isNavItemActive` helper is exported separately so it can be unit-tested
// without pulling in React.

export type ConsoleIconName =
  | 'products'
  | 'categories'
  | 'media'
  | 'crawl'
  | 'queue'
  | 'orders'
  | 'customers'
  | 'reviews'
  | 'pages'
  | 'marketing'
  | 'settings'
  | 'search'
  | 'theme'
  | 'assistant';

export interface ConsoleNavItem {
  href: string;
  label: string;
  icon: ConsoleIconName;
  badge?: number;
}

export interface ConsoleNavGroup {
  label: string;
  items: ConsoleNavItem[];
}

export const CONSOLE_NAV: ConsoleNavGroup[] = [
  {
    label: 'Danh mục sản phẩm',
    items: [
      { href: '/admin/console/products', label: 'Sản phẩm', icon: 'products' },
      { href: '/admin/console/categories', label: 'Danh mục', icon: 'categories' },
      { href: '/admin/console/media', label: 'Thư viện media', icon: 'media' },
    ],
  },
  {
    label: 'Shopee crawler',
    items: [
      { href: '/admin/console/crawl', label: 'Khởi chạy crawl', icon: 'crawl' },
      {
        href: '/admin/console/crawl/queue',
        label: 'Hàng đợi duyệt',
        icon: 'queue',
        badge: 118,
      },
    ],
  },
  {
    label: 'Đơn hàng',
    items: [{ href: '/admin/console/orders', label: 'Đơn hàng', icon: 'orders' }],
  },
  {
    label: 'Khách hàng',
    items: [
      { href: '/admin/console/customers', label: 'Khách hàng', icon: 'customers' },
      {
        href: '/admin/console/reviews',
        label: 'Đánh giá & tương tác',
        icon: 'reviews',
      },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { href: '/admin/console/content', label: 'Trang & blog', icon: 'pages' },
      { href: '/admin/console/marketing', label: 'Tiếp thị', icon: 'marketing' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [{ href: '/admin/console/settings', label: 'Cài đặt', icon: 'settings' }],
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
