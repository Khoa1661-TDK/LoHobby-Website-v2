# Discord Seller Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add staff-only Discord slash commands (`/orders`, `/order <code>`, `/sales`) plus full-lifecycle action buttons on order detail, on top of the existing notification/confirm integration.

**Architecture:** The existing HTTP interactions route (`app/api/discord/interactions/route.ts`) is extended to handle interaction `type 2` (slash commands) by delegating to a pure dispatcher in `lib/discord/commands.ts`. Embeds/buttons are built by pure functions in `lib/discord/order-embeds.ts`. Order queries reuse/extend `lib/payload-orders.ts` and the existing `lib/order-fulfillment.ts` transition functions. Commands register as guild-scoped via a new script.

**Tech Stack:** Payload CMS 3, Next.js route handlers, Discord HTTP interactions API v10, Vitest.

## Global Constraints

- Staff-only: every slash command and button action is gated on `config.allowedUserIds` (from the `notification-settings` global), matching the existing confirm button.
- Responses use Discord interaction response objects: `type 1` (PONG), `type 4` (CHANNEL_MESSAGE_WITH_SOURCE; ephemeral via `flags: 64`), `type 7` (UPDATE_MESSAGE).
- Synchronous responses only (long-running server, 3s window is ample). No deferred responses.
- The Ship action is a link button to `/admin` — never a one-click handler.
- Button custom_id format: `order_action:<action>:<docId>`. The legacy `confirm_order:<docId>` must keep working (maps to `confirm`).
- User-facing copy is Vietnamese (matches existing Discord messages).
- Run tests with the binary directly: `node_modules/.bin/vitest run <path>`.
- Generate migrations with `node_modules/.bin/payload migrate:create`; check `migrate:status` first (remote ledger can drift).
- Re-invite the bot with the `applications.commands` OAuth scope and run the register script before commands appear (deployment step, not code).

---

### Task 1: Pure embed/button builders (`lib/discord/order-embeds.ts`)

**Files:**
- Modify: `lib/discord/order-notification.ts` (export the existing `formatVnd` helper)
- Create: `lib/discord/order-embeds.ts`
- Test: `lib/__tests__/discord-order-embeds.test.ts`

**Interfaces:**
- Consumes: `availableActions(order)`, `ACTION_LABELS`, `OrderAction` from `@/lib/order-transitions`; `absoluteUrl` from `@/lib/utils`; `DiscordEmbed`, `DiscordEmbedField` from `@/lib/discord/order-notification`; `Order` from payload-types.
- Produces:
  - `buildOrdersListEmbed(orders: Order[], statusLabel: string): DiscordEmbed`
  - `buildOrderDetailEmbed(order: Order): DiscordEmbed`
  - `buildOrderActionComponents(order: Order): OrderActionRow[]` where `OrderActionRow = { type: 1; components: OrderActionButton[] }` and `OrderActionButton = { type: 2; style: 1 | 5; label: string; custom_id?: string; url?: string }`
  - `buildSalesEmbed(periodLabel: string, count: number, total: number): DiscordEmbed`

- [ ] **Step 1: Export `formatVnd` from order-notification**

In `lib/discord/order-notification.ts`, change `function formatVnd(` to `export function formatVnd(`.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/discord-order-embeds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { availableActions } from '@/lib/order-transitions';
import {
  buildOrdersListEmbed,
  buildOrderDetailEmbed,
  buildOrderActionComponents,
  buildSalesEmbed,
} from '@/lib/discord/order-embeds';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    orderId: '1007',
    totalAmount: 250000,
    currency: 'VND',
    paymentStatus: 'paid',
    orderStatus: 'processing',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    shippingAddress: '1 Đường ABC',
    deliveryMethod: 'SHIPMENT',
    paymentMethodKey: 'cod',
    lineItems: [{ productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 100000 }],
    createdAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  } as Order;
}

describe('buildOrdersListEmbed', () => {
  it('should include each order code and the status label in the title', () => {
    const embed = buildOrdersListEmbed([order({ id: 1, orderId: '1001' }), order({ id: 2, orderId: '1002' })], 'Tất cả');
    expect(embed.title).toContain('Tất cả');
    const flat = `${embed.description ?? ''}${JSON.stringify(embed.fields)}`;
    expect(flat).toContain('1001');
    expect(flat).toContain('1002');
  });

  it('should show an empty-state message when there are no orders', () => {
    const embed = buildOrdersListEmbed([], 'Chờ xử lý');
    const flat = `${embed.description ?? ''}${JSON.stringify(embed.fields)}`;
    expect(flat.toLowerCase()).toContain('không');
  });
});

describe('buildOrderDetailEmbed', () => {
  it('should show order code, total, customer and statuses', () => {
    const embed = buildOrderDetailEmbed(order());
    expect(embed.title).toContain('1007');
    const flat = JSON.stringify(embed);
    expect(flat).toContain('250.000₫');
    expect(flat).toContain('Nguyễn Văn A');
  });
});

describe('buildOrderActionComponents', () => {
  it('should render a link button (style 5) for ship and custom_id buttons for the rest', () => {
    const o = order();
    const actions = availableActions(o);
    const rows = buildOrderActionComponents(o);
    const buttons = rows.flatMap((r) => r.components);
    for (const action of actions) {
      if (action === 'ship') {
        const link = buttons.find((b) => b.style === 5 && (b.url ?? '').includes('/admin/collections/orders/42'));
        expect(link, 'ship should be a link button to admin').toBeTruthy();
      } else {
        const btn = buttons.find((b) => b.custom_id === `order_action:${action}:42`);
        expect(btn, `expected button for ${action}`).toBeTruthy();
      }
    }
  });

  it('should return no rows for an order with no available actions', () => {
    const rows = buildOrderActionComponents(order({ orderStatus: 'canceled' }));
    expect(rows.flatMap((r) => r.components)).toHaveLength(0);
  });
});

describe('buildSalesEmbed', () => {
  it('should show the count and VND total', () => {
    const embed = buildSalesEmbed('Hôm nay', 3, 750000);
    const flat = JSON.stringify(embed);
    expect(flat).toContain('3');
    expect(flat).toContain('750.000₫');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-order-embeds.test.ts`
Expected: FAIL — module `@/lib/discord/order-embeds` not found.

- [ ] **Step 4: Implement the builders**

Create `lib/discord/order-embeds.ts`:

```ts
// lib/discord/order-embeds.ts — pure Discord embed/button builders for seller commands
import type { Order } from '@/src/payload/payload-types';
import { absoluteUrl } from '@/lib/utils';
import { availableActions, ACTION_LABELS, type OrderAction } from '@/lib/order-transitions';
import { formatVnd, type DiscordEmbed } from '@/lib/discord/order-notification';

export interface OrderActionButton {
  type: 2;
  style: 1 | 5;
  label: string;
  custom_id?: string;
  url?: string;
}
export interface OrderActionRow {
  type: 1;
  components: OrderActionButton[];
}

const ORDER_STATUS_VI: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};
const PAYMENT_STATUS_VI: Record<string, string> = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

function statusVi(value: string | null | undefined): string {
  return ORDER_STATUS_VI[value ?? ''] ?? value ?? '—';
}

export function buildOrdersListEmbed(orders: Order[], statusLabel: string): DiscordEmbed {
  if (orders.length === 0) {
    return {
      title: `📋 Đơn hàng — ${statusLabel}`,
      color: 0x64748b,
      fields: [{ name: '​', value: 'Không có đơn hàng nào.' }],
    };
  }
  const rows = orders.map((o) => {
    const code = o.orderId ?? String(o.id);
    const who = o.customerName ?? '—';
    const total = formatVnd(o.totalAmount ?? 0);
    return `\`#${code}\` · ${who} · ${total} · ${statusVi(o.orderStatus)}`;
  });
  return {
    title: `📋 Đơn hàng — ${statusLabel}`,
    color: 0x3b82f6,
    fields: [{ name: `${orders.length} đơn gần nhất`, value: rows.join('\n').slice(0, 1024) }],
  };
}

export function buildOrderDetailEmbed(order: Order): DiscordEmbed {
  const fields = [
    { name: 'Tổng tiền', value: formatVnd(order.totalAmount ?? 0), inline: true },
    { name: 'Thanh toán', value: PAYMENT_STATUS_VI[order.paymentStatus ?? ''] ?? '—', inline: true },
    { name: 'Trạng thái', value: statusVi(order.orderStatus), inline: true },
  ];
  if (order.customerName) fields.push({ name: 'Khách', value: order.customerName, inline: true });
  if (order.phoneNumber) fields.push({ name: 'SĐT', value: order.phoneNumber, inline: true });
  if (typeof order.shippingAddress === 'string' && order.shippingAddress) {
    fields.push({ name: 'Địa chỉ', value: order.shippingAddress.slice(0, 1024), inline: false });
  }
  const items = Array.isArray(order.lineItems) ? order.lineItems : [];
  if (items.length > 0) {
    const lines = items.map((i) => `• ${i.productTitle ?? i.productId} x${i.quantity}`);
    fields.push({ name: 'Sản phẩm', value: lines.join('\n').slice(0, 1024), inline: false });
  }
  return {
    title: `🧾 Đơn hàng #${order.orderId}`,
    url: absoluteUrl(`/admin/collections/orders/${order.id}`),
    color: 0x22c55e,
    fields,
  };
}

export function buildOrderActionComponents(order: Order): OrderActionRow[] {
  const actions = availableActions({
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentKind: order.paymentKind,
    deliveryMethod: order.deliveryMethod,
  } as Parameters<typeof availableActions>[0]);

  const buttons: OrderActionButton[] = actions.slice(0, 5).map((action: OrderAction) => {
    if (action === 'ship') {
      return {
        type: 2,
        style: 5,
        label: ACTION_LABELS[action],
        url: absoluteUrl(`/admin/collections/orders/${order.id}`),
      };
    }
    return {
      type: 2,
      style: 1,
      label: ACTION_LABELS[action],
      custom_id: `order_action:${action}:${order.id}`,
    };
  });

  return buttons.length > 0 ? [{ type: 1, components: buttons }] : [];
}

export function buildSalesEmbed(periodLabel: string, count: number, total: number): DiscordEmbed {
  return {
    title: `📊 Doanh số — ${periodLabel}`,
    color: 0x8b5cf6,
    fields: [
      { name: 'Số đơn', value: String(count), inline: true },
      { name: 'Doanh thu', value: formatVnd(total), inline: true },
    ],
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-order-embeds.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/discord/order-embeds.ts lib/discord/order-notification.ts lib/__tests__/discord-order-embeds.test.ts
git commit -m "feat(discord): pure embed/button builders for order commands"
```

---

### Task 2: Order query helpers for commands (`lib/payload-orders.ts`)

**Files:**
- Modify: `lib/payload-orders.ts` (append three exports)
- Test: `lib/__tests__/order-sales-summary.test.ts`

**Interfaces:**
- Produces:
  - `summarizeOrders(orders: Array<Pick<Order, 'totalAmount' | 'orderStatus'>>): { count: number; total: number }` (pure)
  - `listRecentOrders(input: { status?: PayloadOrderStatus | 'all'; limit: number }): Promise<Order[]>`
  - `getSalesSummary(input: { since: Date }): Promise<{ count: number; total: number }>`

- [ ] **Step 1: Write the failing test (pure summarizer only)**

Create `lib/__tests__/order-sales-summary.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeOrders } from '@/lib/payload-orders';

describe('summarizeOrders', () => {
  it('should sum totals and count non-canceled orders', () => {
    const result = summarizeOrders([
      { totalAmount: 100000, orderStatus: 'pending' },
      { totalAmount: 250000, orderStatus: 'delivered' },
      { totalAmount: 999000, orderStatus: 'canceled' },
    ]);
    expect(result.count).toBe(2);
    expect(result.total).toBe(350000);
  });

  it('should return zeros for an empty list', () => {
    expect(summarizeOrders([])).toEqual({ count: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/order-sales-summary.test.ts`
Expected: FAIL — `summarizeOrders` not exported.

- [ ] **Step 3: Implement the helpers**

Append to `lib/payload-orders.ts`:

```ts
export function summarizeOrders(
  orders: Array<Pick<Order, 'totalAmount' | 'orderStatus'>>,
): { count: number; total: number } {
  const active = orders.filter((o) => o.orderStatus !== 'canceled');
  return {
    count: active.length,
    total: active.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
  };
}

export async function listRecentOrders(input: {
  status?: PayloadOrderStatus | 'all';
  limit: number;
}): Promise<Order[]> {
  const payload = await getPayload({ config });
  const where =
    input.status && input.status !== 'all'
      ? { orderStatus: { equals: input.status } }
      : undefined;
  const found = await payload.find({
    collection: 'orders',
    where,
    sort: '-createdAt',
    limit: Math.min(Math.max(input.limit, 1), 25),
    pagination: false,
    depth: 0,
  });
  return found.docs as Order[];
}

export async function getSalesSummary(input: {
  since: Date;
}): Promise<{ count: number; total: number }> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    where: { createdAt: { greater_than_equal: input.since.toISOString() } },
    sort: '-createdAt',
    limit: 1000,
    pagination: false,
    depth: 0,
  });
  return summarizeOrders(found.docs as Order[]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/order-sales-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/payload-orders.ts lib/__tests__/order-sales-summary.test.ts
git commit -m "feat(orders): add recent-orders + sales-summary query helpers"
```

---

### Task 3: Command dispatcher (`lib/discord/commands.ts`)

**Files:**
- Create: `lib/discord/commands.ts`
- Test: `lib/__tests__/discord-commands.test.ts`

**Interfaces:**
- Consumes: `listRecentOrders`, `getPayloadOrderByCode`, `getSalesSummary` from `@/lib/payload-orders`; `buildOrdersListEmbed`, `buildOrderDetailEmbed`, `buildOrderActionComponents`, `buildSalesEmbed` from `@/lib/discord/order-embeds`; `markOrderAsPaid`, `confirmOrder`, `syncOrderShipment`, `cancelOrder`, `refundOrder`, `markOrderDelivered`, `FulfillmentResult` from `@/lib/order-fulfillment`; `isOrderAction`, `OrderAction` from `@/lib/order-transitions`.
- Produces:
  - `parseOrderAction(customId: string): { action: OrderAction; docId: string } | null`
  - `applyOrderActionByKey(action: OrderAction, docId: string): Promise<FulfillmentResult>`
  - `successMessage(action: OrderAction, orderCode: number): string`
  - `handleSlashCommand(interaction: SlashInteraction, ctx: { allowedUserIds: string[] }): Promise<DiscordResponse>`
  - types `DiscordResponse = { type: number; data?: Record<string, unknown> }`, `SlashInteraction`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/discord-commands.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listRecentOrders = vi.fn();
const getPayloadOrderByCode = vi.fn();
const getSalesSummary = vi.fn();
const confirmOrder = vi.fn();
const cancelOrder = vi.fn();

vi.mock('@/lib/payload-orders', () => ({ listRecentOrders, getPayloadOrderByCode, getSalesSummary }));
vi.mock('@/lib/order-fulfillment', () => ({
  confirmOrder,
  cancelOrder,
  markOrderAsPaid: vi.fn(),
  syncOrderShipment: vi.fn(),
  refundOrder: vi.fn(),
  markOrderDelivered: vi.fn(),
}));

import { parseOrderAction, applyOrderActionByKey, handleSlashCommand } from '@/lib/discord/commands';

beforeEach(() => {
  vi.clearAllMocks();
  listRecentOrders.mockResolvedValue([]);
  getSalesSummary.mockResolvedValue({ count: 0, total: 0 });
});

describe('parseOrderAction', () => {
  it('should parse the order_action custom_id', () => {
    expect(parseOrderAction('order_action:cancel:42')).toEqual({ action: 'cancel', docId: '42' });
  });
  it('should map the legacy confirm_order custom_id to confirm', () => {
    expect(parseOrderAction('confirm_order:42')).toEqual({ action: 'confirm', docId: '42' });
  });
  it('should return null for unknown ids', () => {
    expect(parseOrderAction('whatever:1')).toBeNull();
    expect(parseOrderAction('order_action:not_an_action:1')).toBeNull();
  });
});

describe('applyOrderActionByKey', () => {
  it('should call confirmOrder for the confirm action', async () => {
    confirmOrder.mockResolvedValue({ ok: true, order: { orderCode: 1 } });
    await applyOrderActionByKey('confirm', '42');
    expect(confirmOrder).toHaveBeenCalledWith('42');
  });
  it('should not perform ship as a one-click action', async () => {
    const res = await applyOrderActionByKey('ship', '42');
    expect(res.ok).toBe(false);
  });
});

function slash(name: string, options: Array<{ name: string; value: unknown }>, userId = '1') {
  return { type: 2, data: { name, options }, member: { user: { id: userId } } };
}

describe('handleSlashCommand', () => {
  const ctx = { allowedUserIds: ['1'] };

  it('should reject a user not in the allowlist', async () => {
    const res = await handleSlashCommand(slash('orders', [], '999'), ctx);
    expect(res.type).toBe(4);
    expect(res.data?.flags).toBe(64);
    expect(listRecentOrders).not.toHaveBeenCalled();
  });

  it('should route /orders to listRecentOrders with the status filter', async () => {
    await handleSlashCommand(slash('orders', [{ name: 'status', value: 'pending' }, { name: 'limit', value: 5 }]), ctx);
    expect(listRecentOrders).toHaveBeenCalledWith({ status: 'pending', limit: 5 });
  });

  it('should return a not-found message when /order code is missing', async () => {
    getPayloadOrderByCode.mockResolvedValue(null);
    const res = await handleSlashCommand(slash('order', [{ name: 'code', value: '9999' }]), ctx);
    expect(JSON.stringify(res.data)).toContain('Không tìm thấy');
  });

  it('should route /sales to getSalesSummary', async () => {
    await handleSlashCommand(slash('sales', [{ name: 'period', value: 'today' }]), ctx);
    expect(getSalesSummary).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-commands.test.ts`
Expected: FAIL — module `@/lib/discord/commands` not found.

- [ ] **Step 3: Implement the dispatcher**

Create `lib/discord/commands.ts`:

```ts
// lib/discord/commands.ts — Discord slash-command dispatcher + order-action mapping
import {
  listRecentOrders,
  getPayloadOrderByCode,
  getSalesSummary,
} from '@/lib/payload-orders';
import {
  buildOrdersListEmbed,
  buildOrderDetailEmbed,
  buildOrderActionComponents,
  buildSalesEmbed,
} from '@/lib/discord/order-embeds';
import {
  markOrderAsPaid,
  confirmOrder,
  syncOrderShipment,
  cancelOrder,
  refundOrder,
  markOrderDelivered,
  type FulfillmentResult,
} from '@/lib/order-fulfillment';
import { isOrderAction, type OrderAction } from '@/lib/order-transitions';
import type { Order } from '@/src/payload/payload-types';
import type { PayloadOrderStatus } from '@/lib/payload-orders';

export type DiscordResponse = { type: number; data?: Record<string, unknown> };
export type SlashInteraction = {
  type: number;
  data?: { name?: string; options?: Array<{ name: string; value: unknown }> };
  member?: { user?: { id?: string } };
};

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: 'Tất cả',
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};

const SUCCESS_LABEL: Record<OrderAction, string> = {
  mark_paid: 'Đã đánh dấu thanh toán đơn',
  confirm: 'Đã xác nhận đơn',
  ship: 'Đã tạo vận đơn',
  sync_tracking: 'Đã cập nhật vận chuyển đơn',
  mark_delivered: 'Đã đánh dấu giao thành công đơn',
  cancel: 'Đã hủy đơn',
  refund: 'Đã hoàn tiền đơn',
};

function ephemeral(content: string): DiscordResponse {
  return { type: 4, data: { content, flags: 64 } };
}

function getOption(interaction: SlashInteraction, name: string): unknown {
  return interaction.data?.options?.find((o) => o.name === name)?.value;
}

export function parseOrderAction(
  customId: string,
): { action: OrderAction; docId: string } | null {
  if (customId.startsWith('confirm_order:')) {
    return { action: 'confirm', docId: customId.slice('confirm_order:'.length) };
  }
  if (customId.startsWith('order_action:')) {
    const [, action, docId] = customId.split(':');
    if (action && docId && isOrderAction(action)) {
      return { action, docId };
    }
  }
  return null;
}

export async function applyOrderActionByKey(
  action: OrderAction,
  docId: string,
): Promise<FulfillmentResult> {
  switch (action) {
    case 'mark_paid':
      return markOrderAsPaid(docId);
    case 'confirm':
      return confirmOrder(docId);
    case 'sync_tracking':
      return syncOrderShipment(docId);
    case 'mark_delivered':
      return markOrderDelivered(docId);
    case 'cancel':
      return cancelOrder(docId);
    case 'refund':
      return refundOrder(docId);
    case 'ship':
    default:
      return { ok: false, message: 'Vui lòng tạo vận đơn trong trang quản trị.' };
  }
}

export function successMessage(action: OrderAction, orderCode: number): string {
  return `✅ ${SUCCESS_LABEL[action]} #${orderCode}.`;
}

export async function handleSlashCommand(
  interaction: SlashInteraction,
  ctx: { allowedUserIds: string[] },
): Promise<DiscordResponse> {
  const userId = interaction.member?.user?.id ?? '';
  if (!ctx.allowedUserIds.includes(userId)) {
    return ephemeral('Bạn không có quyền dùng lệnh này.');
  }

  const name = interaction.data?.name ?? '';

  if (name === 'orders') {
    const status = (typeof getOption(interaction, 'status') === 'string'
      ? (getOption(interaction, 'status') as string)
      : 'all') as PayloadOrderStatus | 'all';
    const limitRaw = getOption(interaction, 'limit');
    const limit = typeof limitRaw === 'number' ? limitRaw : 10;
    const orders = await listRecentOrders({ status, limit });
    return { type: 4, data: { embeds: [buildOrdersListEmbed(orders, STATUS_FILTER_LABEL[status] ?? 'Tất cả')], flags: 64 } };
  }

  if (name === 'order') {
    const codeRaw = getOption(interaction, 'code');
    const code = Number.parseInt(String(codeRaw ?? ''), 10);
    if (!Number.isInteger(code)) return ephemeral('Mã đơn không hợp lệ.');
    const order = (await getPayloadOrderByCode(code)) as Order | null;
    if (!order) return ephemeral(`Không tìm thấy đơn hàng #${code}.`);
    return {
      type: 4,
      data: {
        embeds: [buildOrderDetailEmbed(order)],
        components: buildOrderActionComponents(order),
        flags: 64,
      },
    };
  }

  if (name === 'sales') {
    const period = getOption(interaction, 'period') === 'week' ? 'week' : 'today';
    const since = new Date();
    if (period === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setHours(0, 0, 0, 0);
    }
    const summary = await getSalesSummary({ since });
    const label = period === 'week' ? '7 ngày qua' : 'Hôm nay';
    return { type: 4, data: { embeds: [buildSalesEmbed(label, summary.count, summary.total)], flags: 64 } };
  }

  return ephemeral('Lệnh không được hỗ trợ.');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discord/commands.ts lib/__tests__/discord-commands.test.ts
git commit -m "feat(discord): slash-command dispatcher + order-action mapping"
```

---

### Task 4: Add Application ID + Guild ID to the notification settings global (+ migration + config)

**Files:**
- Modify: `src/payload/globals/NotificationSettings.ts`
- Modify: `lib/discord/client.ts` (extend `DiscordConfig`, `NotificationGlobalShape`, `getDiscordConfig`)
- Create: `src/migrations/<generated>.ts` (CLI)
- Modify: `src/payload/payload-types.ts` (regenerated)

**Interfaces:**
- Produces: `DiscordConfig` gains `applicationId: string` and `guildId: string`.

- [ ] **Step 1: Add the fields to the global**

In `src/payload/globals/NotificationSettings.ts`, append to the `fields` array:

```ts
{
  name: 'discordApplicationId',
  type: 'text',
  label: 'Discord application (client) ID',
  admin: { description: 'From General Information. Required to register slash commands.' },
},
{
  name: 'discordGuildId',
  type: 'text',
  label: 'Discord server (guild) ID',
  admin: { description: 'The staff server where slash commands are registered.' },
},
```

- [ ] **Step 2: Extend the config reader**

In `lib/discord/client.ts`:

Add to `DiscordConfig`:

```ts
  applicationId: string;
  guildId: string;
```

Add to `NotificationGlobalShape`:

```ts
  discordApplicationId?: string | null;
  discordGuildId?: string | null;
```

In `getDiscordConfig`, add to the returned object:

```ts
    applicationId: g.discordApplicationId ?? '',
    guildId: g.discordGuildId ?? '',
```

- [ ] **Step 3: Generate + apply the migration and types**

Run: `node_modules/.bin/payload migrate:status`
Expected: ledger current (resolve drift first if not).

Run: `node_modules/.bin/payload migrate:create discord_command_registration`
Run: `node_modules/.bin/payload generate:types`
Run: `node_modules/.bin/payload migrate`
Expected: migration adds `discord_application_id` + `discord_guild_id` columns and runs cleanly; `NotificationSetting` type includes the new fields.

- [ ] **Step 4: Verify existing Discord tests still pass**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-order-message.test.ts`
Expected: PASS (config shape change is additive).

- [ ] **Step 5: Commit**

```bash
git add src/payload/globals/NotificationSettings.ts lib/discord/client.ts src/migrations/ src/payload/payload-types.ts
git commit -m "feat(discord): store application + guild id for command registration"
```

---

### Task 5: Wire the dispatcher into the interactions route

**Files:**
- Modify: `app/api/discord/interactions/route.ts`
- Test: `lib/__tests__/discord-interactions.test.ts` (extend; keep existing cases green)

**Interfaces:**
- Consumes: `handleSlashCommand`, `parseOrderAction`, `applyOrderActionByKey`, `successMessage` from `@/lib/discord/commands`.

- [ ] **Step 1: Add a failing test for slash-command routing**

In `lib/__tests__/discord-interactions.test.ts`, add this mock near the other `vi.mock` calls:

```ts
const handleSlashCommandMock = vi.fn();
vi.mock('@/lib/discord/commands', async () => {
  const actual = await vi.importActual<typeof import('@/lib/discord/commands')>('@/lib/discord/commands');
  return { ...actual, handleSlashCommand: (...args: unknown[]) => handleSlashCommandMock(...args) };
});
```

Add this test inside the `describe` block:

```ts
it('should delegate slash commands (type 2) to handleSlashCommand', async () => {
  verifyMock.mockReturnValue(true);
  handleSlashCommandMock.mockResolvedValue({ type: 4, data: { content: 'ok', flags: 64 } });
  const res = await POST(
    req({ type: 2, data: { name: 'orders', options: [] }, member: { user: { id: '1' } } }),
  );
  const json = await res.json();
  expect(handleSlashCommandMock).toHaveBeenCalledTimes(1);
  expect(json.type).toBe(4);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-interactions.test.ts`
Expected: FAIL — route does not handle `type 2` yet (no call to `handleSlashCommandMock`).

- [ ] **Step 3: Refactor the route**

Replace the body of `app/api/discord/interactions/route.ts` after the imports. Update the imports block to:

```ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyDiscordSignature } from '@/lib/discord/verify';
import { getDiscordConfig } from '@/lib/discord/client';
import {
  handleSlashCommand,
  parseOrderAction,
  applyOrderActionByKey,
  successMessage,
} from '@/lib/discord/commands';
```

Keep `runtime`, `dynamic`, `PONG`, `ephemeral`, `updateMessage` as they are, then replace the interaction-handling section (everything after the signature check) with:

```ts
  const interaction = JSON.parse(rawBody) as {
    type: number;
    data?: { name?: string; custom_id?: string; options?: Array<{ name: string; value: unknown }> };
    member?: { user?: { id?: string } };
  };

  if (interaction.type === 1) {
    return NextResponse.json(PONG);
  }

  // Slash commands.
  if (interaction.type === 2) {
    const result = await handleSlashCommand(interaction, {
      allowedUserIds: discord.allowedUserIds,
    });
    return NextResponse.json(result);
  }

  // Message component (buttons).
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? '';
    const parsed = parseOrderAction(customId);
    if (!parsed) {
      return ephemeral('Hành động không hợp lệ.');
    }

    const userId = interaction.member?.user?.id ?? '';
    if (!discord.allowedUserIds.includes(userId)) {
      return ephemeral('Bạn không có quyền thực hiện hành động này.');
    }

    const result = await applyOrderActionByKey(parsed.action, parsed.docId);
    if (!result.ok) {
      return updateMessage(`⚠️ ${result.message}`);
    }
    return updateMessage(successMessage(parsed.action, result.order.orderCode));
  }

  return NextResponse.json({ error: 'unsupported interaction type' }, { status: 400 });
```

- [ ] **Step 4: Run the full interactions test to verify all pass**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-interactions.test.ts`
Expected: PASS — existing confirm/PING/allowlist/error cases plus the new slash-command case. (The confirm case still asserts `confirmOrder('42')` is called, type 7, and "Đã xác nhận" — satisfied because `parseOrderAction('confirm_order:42')` → confirm and `successMessage('confirm', ...)` contains "Đã xác nhận đơn".)

- [ ] **Step 5: Commit**

```bash
git add app/api/discord/interactions/route.ts lib/__tests__/discord-interactions.test.ts
git commit -m "feat(discord): handle slash commands + full action buttons in route"
```

---

### Task 6: Guild command registration script

**Files:**
- Create: `scripts/discord-register-commands.ts`

**Interfaces:**
- Consumes: `getDiscordConfig` from `@/lib/discord/client`; `getPayload` from payload.

- [ ] **Step 1: Create the registration script**

Create `scripts/discord-register-commands.ts`:

```ts
// scripts/discord-register-commands.ts — register guild-scoped slash commands.
// Run: node_modules/.bin/tsx scripts/discord-register-commands.ts
import { getPayload } from 'payload';
import config from '@payload-config';
import { getDiscordConfig } from '@/lib/discord/client';

const COMMANDS = [
  {
    name: 'orders',
    description: 'Liệt kê đơn hàng gần đây',
    options: [
      {
        name: 'status',
        description: 'Lọc theo trạng thái',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Tất cả', value: 'all' },
          { name: 'Chờ xử lý', value: 'pending' },
          { name: 'Đang xử lý', value: 'processing' },
          { name: 'Đang giao', value: 'shipped' },
          { name: 'Đã giao', value: 'delivered' },
          { name: 'Đã hủy', value: 'canceled' },
        ],
      },
      { name: 'limit', description: 'Số đơn (tối đa 25)', type: 4, required: false }, // INTEGER
    ],
  },
  {
    name: 'order',
    description: 'Xem chi tiết một đơn hàng',
    options: [{ name: 'code', description: 'Mã đơn hàng', type: 3, required: true }],
  },
  {
    name: 'sales',
    description: 'Tổng doanh số',
    options: [
      {
        name: 'period',
        description: 'Khoảng thời gian',
        type: 3,
        required: false,
        choices: [
          { name: 'Hôm nay', value: 'today' },
          { name: '7 ngày qua', value: 'week' },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const discord = await getDiscordConfig(payload);
  if (!discord.botToken || !discord.applicationId || !discord.guildId) {
    throw new Error('Missing botToken / applicationId / guildId in Notification settings.');
  }

  const url = `https://discord.com/api/v10/applications/${discord.applicationId}/guilds/${discord.guildId}/commands`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${discord.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Register failed: ${res.status} ${detail}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Registered ${COMMANDS.length} guild commands.`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Type-check the script**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep discord-register-commands || echo "no type errors"`
Expected: `no type errors`.

- [ ] **Step 3: Commit**

```bash
git add scripts/discord-register-commands.ts
git commit -m "feat(discord): guild slash-command registration script"
```

- [ ] **Step 4: Run the full Discord test suite**

Run: `node_modules/.bin/vitest run lib/__tests__/discord-order-embeds.test.ts lib/__tests__/discord-commands.test.ts lib/__tests__/discord-interactions.test.ts lib/__tests__/order-sales-summary.test.ts lib/__tests__/discord-order-message.test.ts lib/__tests__/discord-verify.test.ts`
Expected: all PASS.

---

## Deployment / Activation (after merge + deploy — not code)

1. In `/admin → Settings → Notification settings`: fill Application ID + Guild ID (already have token, channel, public key, allowed user IDs).
2. Re-invite the bot with the `applications.commands` scope (OAuth2 URL Generator).
3. Set the Interactions Endpoint URL to `https://DOMAIN/api/discord/interactions` (required for both buttons and slash commands; see the discord-bot-runtime-setup memory).
4. Run `node_modules/.bin/tsx scripts/discord-register-commands.ts`.
5. Commands appear instantly in the guild.

## Self-Review Notes

- Spec coverage: `/orders` (Task 3 routing + Task 2 query + Task 1 embed), `/order` detail + action buttons (Tasks 1+3), `/sales` (Tasks 1+2+3), guild registration + new global fields (Tasks 4+6), route handling type 2 + extended buttons (Task 5), allow-list gating (Task 3 + Task 5), tests (Tasks 1–5), legacy confirm_order back-compat (Task 3 parse + Task 5 route, verified by the retained existing test). All covered.
- Type consistency: `OrderAction` used consistently from `@/lib/order-transitions`; `FulfillmentResult.order.orderCode` (number) used in `successMessage`; `DiscordResponse` shape returned by `handleSlashCommand` and JSON-wrapped by the route.
- Ship is never a one-click action: link button in Task 1, guarded in `applyOrderActionByKey` in Task 3.
```
