import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal, ToolContext } from '@/lib/admin-assistant/types';

export const proposeProductImagesTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_product_images',
      description: 'Đề xuất cập nhật hình ảnh sản phẩm',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID sản phẩm' },
          image: { type: 'integer', description: 'ID hình ảnh chính' },
          gallery: { type: 'array', description: 'Mảng ID hình ảnh phụ' },
        },
        required: ['id'],
      },
    },
  },
  run: async (args, ctx) => {
    const id = args.id as number;
    const image = args.image as number | undefined;
    const gallery = args.gallery as unknown[] | undefined;

    if (image === undefined && (!gallery || gallery.length === 0)) {
      return fail('Phải cung cấp ít nhất image hoặc gallery.');
    }

    if (gallery !== undefined && (!Array.isArray(gallery) || !gallery.every((v: unknown) => typeof v === 'number'))) {
      return fail('gallery phải là mảng các số nguyên.');
    }

    const doc = await ctx.payload.findByID({ collection: 'products', id, depth: 0 });
    if (!doc) return fail('Không tìm thấy sản phẩm.');

    const idsToCheck: number[] = [];
    if (image !== undefined) idsToCheck.push(image);
    if (gallery) idsToCheck.push(...gallery);

    if (idsToCheck.length > 0) {
      const mediaRes = await ctx.payload.find({
        collection: 'media',
        depth: 0,
        where: { id: { in: idsToCheck } },
      });
      const existingIds = new Set(
        mediaRes.docs.map((d) => Number((d as unknown as Record<string, unknown>).id)),
      );
      const missing = idsToCheck.filter((i) => !existingIds.has(i));
      if (missing.length > 0) {
        return fail(`Không tìm thấy media: ${missing.join(', ')}.`);
      }
    }

    const summary = `Cập nhật hình ảnh cho sản phẩm ${doc.title}`;

    // Typed so tsc enforces the shape the apply route re-validates.
    const proposal: Proposal = {
      kind: 'productImages',
      id,
      ...(image !== undefined ? { image } : {}),
      ...(gallery ? { gallery } : {}),
      summary,
    };

    return ok('STAGED: ' + summary, proposal);
  },
};
