import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { WRITABLE_GLOBALS, isAllowedGlobal } from '@/lib/admin-assistant/types';
import { flattenGlobalFields, getGlobalFields } from '@/lib/admin-assistant/settings-schema';

export const describeTargetTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'describe_target',
      description: 'Mô tả cấu trúc dữ liệu',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...WRITABLE_GLOBALS, 'product'], description: 'Loại đối tượng' },
        },
        required: ['kind'],
      },
    },
  },
  run: async (args, ctx) => {
    const kind = args.kind as string;

    if (kind === 'product') {
      const spec = [
        { path: 'title', type: 'string', note: 'Tên sản phẩm' },
        { path: 'price', type: 'number', note: 'Giá VND nguyên >= 0' },
        { path: 'stock', type: 'number', note: 'Số lượng tồn kho nguyên >= 0' },
        { path: 'available', type: 'boolean', note: 'Trạng thái khả dụng' },
        { path: 'onSale', type: 'boolean', note: 'Đang giảm giá' },
        { path: 'salePercent', type: 'number', note: 'Phần trăm giảm giá 0-100' },
        { path: 'category', type: 'number', note: 'ID danh mục từ find_products' },
      ];
      return ok(spec);
    }

    if (!isAllowedGlobal(kind)) {
      return fail(`Loại '${kind}' không hợp lệ.`);
    }

    const fields = flattenGlobalFields(getGlobalFields(ctx.payload, kind));
    return ok(fields);
  },
};
