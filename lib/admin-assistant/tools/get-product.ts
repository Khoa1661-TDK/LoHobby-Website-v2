import { ok, fail, asInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';

export const getProductTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_product',
      description: 'Xem chi tiết sản phẩm',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID sản phẩm' },
        },
        required: ['id'],
      },
    },
  },
  run: async (args, ctx) => {
    const id = asInt(args, 'id');
    if (id === null) {
      return fail('id phải là số nguyên.');
    }

    const doc = await ctx.payload.findByID({
      collection: 'products',
      id,
      depth: 1,
      locale: ctx.locale,
    });

    if (!doc) {
      return fail('Không tìm thấy sản phẩm.');
    }

    // Payload returns either a bare id (depth 0) or a populated doc. Normalise to a number.
    const relId = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (value && typeof value === 'object') {
        const nested = (value as Record<string, unknown>).id;
        if (typeof nested === 'number') return nested;
      }
      return null;
    };

    const raw = doc as unknown as Record<string, unknown>;
    // `category` is hasMany, so it is always an array.
    const categoryIds = (Array.isArray(raw.category) ? raw.category : [])
      .map(relId)
      .filter((value): value is number => value !== null);
    const imageId = relId(raw.image);
    const gallery = (Array.isArray(raw.gallery) ? raw.gallery : [])
      .map((row) => relId((row as Record<string, unknown>).media))
      .filter((value): value is number => value !== null);
    const variantDocs = (raw.variants as { docs?: unknown[] } | undefined)?.docs ?? [];
    const variants = variantDocs.map((variant) => {
      const v = variant as Record<string, unknown>;
      return { id: v.id, name: v.name, sku: v.sku ?? null, stock: v.stock ?? null };
    });

    return ok({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      price: doc.price,
      stock: doc.stock,
      available: doc.available,
      onSale: doc.onSale,
      salePercent: doc.salePercent,
      categoryIds,
      image: imageId,
      gallery,
      variants,
    });
  },
};
