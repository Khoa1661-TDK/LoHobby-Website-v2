import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal, ToolContext } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { availableActions, isOrderAction, ACTION_LABELS, ShipInput } from '@/lib/order-transitions';

export const proposeOrderActionTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_order_action',
      description: 'Đề xuất hành động đơn hàng',
      parameters: {
        type: 'object',
        properties: {
          docId: { type: 'integer', description: 'ID tài liệu đơn hàng' },
          action: { type: 'string', description: 'Hành động đề xuất' },
          carrierKey: { type: 'string', description: 'Mã vận chuyển (cần cho ship)' },
          trackingNumber: { type: 'string', description: 'Số theo dõi (cần cho ship)' },
          customTrackingUrl: { type: 'string', description: 'URL theo dõi tùy chỉnh' },
        },
        required: ['docId', 'action'],
      },
    },
  },
  run: async (args, ctx) => {
    const docId = args.docId as number;
    const action = args.action as string;
    const carrierKey = args.carrierKey as string | undefined;
    const trackingNumber = args.trackingNumber as string | undefined;
    const customTrackingUrl = args.customTrackingUrl as string | undefined;

    if (!isOrderAction(action)) {
      return fail(`Hành động '${action}' không hợp lệ.`);
    }

    const res = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });

    const views = res.docs.map(mapOrderToFulfillmentView);
    const match = views.find((v) => v.id === docId);

    if (!match) {
      return fail('Không tìm thấy đơn hàng.');
    }

    const allowed = availableActions(match);
    if (!allowed.includes(action)) {
      return fail(`Hành động '${action}' không được phép. Các hành động khả dụng: ${allowed.join(', ')}.`);
    }

    // Built inside the branch so the emptiness checks actually narrow the types.
    let input: ShipInput | undefined;
    if (action === 'ship') {
      if (!carrierKey || !trackingNumber) {
        return fail('Hành động ship yêu cầu carrierKey và trackingNumber.');
      }
      input = {
        carrierKey,
        trackingNumber,
        ...(customTrackingUrl ? { customTrackingUrl } : {}),
      };
    }

    const summary = `${ACTION_LABELS[action] || action} đơn ${match.orderCode}`;

    // Typed so tsc enforces the shape the apply route re-validates.
    const proposal: Proposal = {
      kind: 'orderAction',
      docId: Number(match.id),
      orderCode: match.orderCode,
      action,
      ...(input ? { input } : {}),
      summary,
    };

    return ok('STAGED: ' + summary, proposal);
  },
};
