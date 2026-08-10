import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';

export const ADMIN_PAGE_TARGETS: Record<string, string> = {
  'store-settings': '/admin/globals/store-settings',
  'shipping': '/admin/globals/shipping-settings',
  'notifications': '/admin/globals/notification-settings',
  'auto-sale': '/admin/globals/auto-sale-settings',
  'header': '/admin/globals/site-header',
  'navigation': '/admin/globals/navigation',
  'dropship': '/admin/globals/dropship-settings',
  'orders': '/admin/orders',
  'order': '/admin/collections/orders/{id}',
  'products': '/admin/collections/products',
  'product': '/admin/collections/products/{id}',
  'media': '/admin/collections/media',
  'coupons': '/admin/coupons',
  'gift-cards': '/admin/gift-cards',
  'campaigns': '/admin/campaigns',
  'reviews': '/admin/reviews',
  'catalog-tools': '/admin/catalog-tools',
  'analytics': '/admin/analytics',
  'page-builder': '/build',
};

export const openAdminPageTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'open_admin_page',
      description: 'Mở trang quản trị',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: Object.keys(ADMIN_PAGE_TARGETS), description: 'Trang cần mở' },
          id: { type: 'integer', description: 'ID tài liệu (cần thiết cho một số trang)' },
        },
        required: ['target'],
      },
    },
  },
  run: async (args, ctx) => {
    const target = args.target as string;
    const id = args.id as number | undefined;

    const template = ADMIN_PAGE_TARGETS[target];
    if (!template) {
      return fail(`Mục tiêu '${target}' không hợp lệ.`);
    }

    if (template.includes('{id}')) {
      if (id === undefined || id === null) {
        return fail('Thiếu id cho mục tiêu này.');
      }
      const url = template.replace('{id}', String(id));
      return ok('Link: ' + url, { kind: 'link', url, label: `Mở ${target}` });
    }

    return ok('Link: ' + template, { kind: 'link', url: template, label: `Mở ${target}` });
  },
};
