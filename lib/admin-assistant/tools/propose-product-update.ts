import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal, ToolContext } from '@/lib/admin-assistant/types';
import { isWritableProductField, WRITABLE_PRODUCT_FIELDS } from '@/lib/admin-assistant/types';

export const proposeProductUpdateTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_product_update',
      description: 'Đề xuất cập nhật sản phẩm',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID sản phẩm' },
          fields: { type: 'object', description: 'Các trường cần cập nhật' },
        },
        required: ['id', 'fields'],
      },
    },
  },
  run: async (args, ctx) => {
    const id = args.id as number;
    const fields = args.fields as Record<string, unknown>;

    if (!fields || Object.keys(fields).length === 0) {
      return fail('Phải cung cấp ít nhất một trường để cập nhật.');
    }

    const allowedList = WRITABLE_PRODUCT_FIELDS.join(', ');
    for (const key of Object.keys(fields)) {
      if (!isWritableProductField(key)) {
        return fail(`Trường '${key}' không được phép. Chỉ chấp nhận: ${allowedList}.`);
      }
    }

    const validatedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'title') {
        if (typeof value !== 'string' || !value.trim()) return fail('title phải là chuỗi không rỗng.');
        validatedFields[key] = value.trim();
      } else if (key === 'price') {
        if (typeof value !== 'number' || value < 0) return fail('price phải là số >= 0.');
        validatedFields[key] = value;
      } else if (key === 'stock') {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return fail('stock phải là số nguyên >= 0.');
        validatedFields[key] = value;
      } else if (key === 'available' || key === 'onSale') {
        if (typeof value !== 'boolean') return fail(`${key} phải là boolean.`);
        validatedFields[key] = value;
      } else if (key === 'salePercent') {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) return fail('salePercent phải là số nguyên 0-100.');
        validatedFields[key] = value;
      } else if (key === 'category') {
        if (typeof value === 'string') return fail('category phải là số nguyên, không chấp nhận chuỗi.');
        if (Array.isArray(value)) {
          if (!value.every((v: unknown) => typeof v === 'number')) return fail('category phải là mảng số nguyên.');
          validatedFields[key] = value;
        } else if (typeof value === 'number') {
          validatedFields[key] = [value];
        } else {
          return fail('category phải là số nguyên hoặc mảng số nguyên.');
        }
      }
    }

    const doc = await ctx.payload.findByID({ collection: 'products', id, depth: 0 });
    if (!doc) return fail('Không tìm thấy sản phẩm.');

    const summary = `Cập nhật sản phẩm ${doc.title}`;
    // Typed so tsc enforces the shape the apply route re-validates.
    const proposal: Proposal = {
      kind: 'productUpdate',
      id,
      fields: validatedFields,
      summary,
    };

    return ok('STAGED: ' + summary, proposal);
  },
};
