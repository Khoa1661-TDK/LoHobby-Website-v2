import { ok, fail, asStr, asInt, optInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, ToolContext } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { availableActions } from '@/lib/order-transitions';

export const findOrdersTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'find_orders',
      description: 'Tìm kiếm đơn hàng',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Lọc theo trạng thái đơn hàng' },
          query: { type: 'string', description: 'Tìm kiếm theo tên khách hàng hoặc mã đơn' },
          limit: { type: 'integer', description: 'Số lượng kết quả tối đa' },
        },
        required: [],
      },
    },
  },
  run: async (args, ctx) => {
    const status = asStr(args, 'status');
    const query = asStr(args, 'query');
    const limit = optInt(args, 'limit', 10, 25);

    const res = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });

    const views = res.docs.map(mapOrderToFulfillmentView);

    let filtered = views;
    if (status) {
      filtered = filtered.filter((v) => v.orderStatus === status);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          (v.customerName && v.customerName.toLowerCase().includes(q)) ||
          (v.orderCode && String(v.orderCode).toLowerCase().includes(q)),
      );
    }

    const rows = filtered.slice(0, limit).map((v) => ({
      docId: v.id,
      orderCode: v.orderCode,
      customerName: v.customerName,
      totalAmount: v.totalAmount,
      paymentStatus: v.paymentStatus,
      orderStatus: v.orderStatus,
      createdAt: v.createdAt,
      availableActions: availableActions(v),
    }));

    return ok(rows);
  },
};
