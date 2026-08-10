import { ok, fail, asStr, optInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { searchMedia } from '@/lib/page-builder/assistant/resource-search';

export const searchMediaTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_media',
      description: 'Tìm kiếm media',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Từ khóa tìm kiếm' },
          limit: { type: 'integer', description: 'Số lượng kết quả tối đa' },
        },
        required: ['query'],
      },
    },
  },
  run: async (args, ctx) => {
    const query = asStr(args, 'query');
    const limit = optInt(args, 'limit', 10, 25);
    const res = await searchMedia(ctx.payload, query, limit);
    return ok(res);
  },
};
