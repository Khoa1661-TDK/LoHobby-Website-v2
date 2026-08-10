import { ok, fail, asInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { availableActions } from '@/lib/order-transitions';

export const getOrderTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Xem chi tiết đơn hàng',
      parameters: {
        type: 'object',
        properties: {
          orderCode: { type: 'integer', description: 'Mã đơn hàng' },
          docId: { type: 'integer', description: 'ID tài liệu' },
        },
        required: [],
      },
    },
  },
  run: async (args, ctx) => {
    const orderCode = asInt(args, 'orderCode');
    const docId = asInt(args, 'docId');

    if (orderCode === null && docId === null) {
      return fail('Vui lòng cung cấp orderCode hoặc docId.');
    }

    const res = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });

    const views = res.docs.map(mapOrderToFulfillmentView);
    const match = views.find((v) => {
      if (orderCode !== null && v.orderCode === orderCode) return true;
      if (docId !== null && String(v.id) === String(docId)) return true;
      return false;
    });

    if (!match) {
      return fail('Không tìm thấy đơn hàng.');
    }

    return ok({
      ...match,
      availableActions: availableActions(match),
    });
  },
};
