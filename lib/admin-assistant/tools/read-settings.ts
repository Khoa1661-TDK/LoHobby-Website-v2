import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { WRITABLE_GLOBALS, isAllowedGlobal } from '@/lib/admin-assistant/types';
import { flattenGlobalFields, getGlobalFields, readByPath } from '@/lib/admin-assistant/settings-schema';

export const readSettingsTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'read_settings',
      description: 'Đọc cài đặt toàn cục',
      parameters: {
        type: 'object',
        properties: {
          global: { type: 'string', enum: WRITABLE_GLOBALS, description: 'Tên global' },
        },
        required: ['global'],
      },
    },
  },
  run: async (args, ctx) => {
    const globalSlug = args.global as string;
    if (!isAllowedGlobal(globalSlug)) {
      return fail(`Global '${globalSlug}' không được phép đọc.`);
    }

    const res = await ctx.payload.findGlobal({ slug: globalSlug, depth: 0, locale: ctx.locale });
    if (!res) {
      return fail('Không tìm thấy global.');
    }

    const descriptors = flattenGlobalFields(getGlobalFields(ctx.payload, globalSlug));
    const values: Record<string, unknown> = {};
    for (const desc of descriptors) {
      const val = readByPath(res, desc.path);
      if (val !== undefined) {
        values[desc.path] = val;
      }
    }

    return ok(values);
  },
};
