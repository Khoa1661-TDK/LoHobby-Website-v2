import { ok, fail, asStr, asInt, optInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { searchCatalog } from '@/lib/page-builder/assistant/resource-search';

export const findProductsTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'find_products',
      description: 'Tìm kiếm sản phẩm hoặc danh mục',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Từ khóa tìm kiếm' },
          collection: { type: 'string', description: 'Thuộc tính: products hoặc categories' },
          limit: { type: 'integer', description: 'Số lượng kết quả tối đa' },
        },
        required: ['query'],
      },
    },
  },
  run: async (args, ctx) => {
    const query = asStr(args, 'query');
    const collection = asStr(args, 'collection') || 'products';
    const limit = optInt(args, 'limit', 10, 25);

    if (collection === 'categories') {
      const res = await searchCatalog(ctx.payload, 'categories', query, limit, ctx.locale);
      return ok(res);
    }

    if (collection !== 'products') {
      return fail(`Thuộc tính '${collection}' không được hỗ trợ. Chỉ chấp nhận 'products' hoặc 'categories'.`);
    }

    const where = query ? { title: { like: query } } : undefined;
    const res = await ctx.payload.find({
      collection: 'products',
      depth: 0,
      limit,
      locale: ctx.locale,
      sort: '-createdAt',
      where,
    });

    const rows = res.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      price: doc.price,
      stock: doc.stock,
      available: doc.available,
      onSale: doc.onSale,
      salePercent: doc.salePercent,
    }));

    return ok(rows);
  },
};
