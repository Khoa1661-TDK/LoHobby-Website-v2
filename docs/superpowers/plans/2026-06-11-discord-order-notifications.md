# Discord Order Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seller's Zalo order notification with a Discord bot message carrying a "Xác nhận đơn" button that confirms the order from inside Discord.

**Architecture:** Outbound — the existing `notifySellerOnNewOrder` afterChange hook calls a Discord `notifyNewOrder()` which has a bot post an embed + button to a channel. Inbound — a public `/api/discord/interactions` route verifies Discord's Ed25519 signature, checks an allowlist, and calls the existing `confirmOrder()`.

**Tech Stack:** Next.js 15 route handlers, Payload CMS global config + migration, Node `crypto` (Ed25519, no new dependency), Vitest. Discord API v10 (bot message send + interactions).

**Spec:** `docs/superpowers/specs/2026-06-11-discord-order-notifications-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/payload/globals/NotificationSettings.ts` | Discord config fields (modify — replace Zalo fields) |
| `src/migrations/<generated>.ts/.json` | Schema migration for the global (generated) |
| `lib/discord/order-notification.ts` | Build embed + button; `notifyNewOrder()` |
| `lib/discord/client.ts` | Read config from global; send a channel message via bot API |
| `lib/discord/verify.ts` | Ed25519 signature verification |
| `app/api/discord/interactions/route.ts` | Public interactions endpoint (PING + button) |
| `lib/payload-order-hooks.ts` | Swap import to Discord (modify, 1 line) |
| `lib/__tests__/discord-order-message.test.ts` | Builder tests |
| `lib/__tests__/discord-verify.test.ts` | Signature tests |
| `lib/__tests__/discord-interactions.test.ts` | Route handler tests |
| **Deleted** | `lib/zalo/oa-client.ts`, `lib/zalo/order-notification.ts`, `lib/__tests__/zalo-*.test.ts` |

---

## Task 1: Swap NotificationSettings global to Discord fields

**Files:**
- Modify: `src/payload/globals/NotificationSettings.ts`
- Generate: `src/migrations/<timestamp>.ts` + `.json`, updates `src/migrations/index.ts`
- Generate: `src/payload/payload-types.ts` (regenerated)

- [ ] **Step 1: Replace the fields in the global**

Replace the entire contents of `src/payload/globals/NotificationSettings.ts` with:

```ts
// src/payload/globals/NotificationSettings.ts — admin-managed Discord order notifications
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';

export const NotificationSettings: GlobalConfig = {
  slug: 'notification-settings',
  label: 'Notification settings',
  admin: {
    description:
      'Discord notifications sent to the seller when a new order is placed. The seller can confirm the order from Discord.',
    group: 'Settings',
  },
  access: {
    read: payloadAdminAccess,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'discordEnabled',
      type: 'checkbox',
      label: 'Enable Discord order notifications',
      defaultValue: false,
    },
    {
      name: 'discordBotToken',
      type: 'text',
      label: 'Discord bot token',
      admin: { description: 'From the Discord Developer Portal → your app → Bot.' },
    },
    {
      name: 'discordChannelId',
      type: 'text',
      label: 'Discord channel ID',
      admin: { description: 'The channel the bot posts new-order notifications to.' },
    },
    {
      name: 'discordPublicKey',
      type: 'text',
      label: 'Discord application public key',
      admin: {
        description: 'From the app General Information page. Used to verify button presses.',
      },
    },
    {
      name: 'discordAllowedUserIds',
      type: 'text',
      label: 'Allowed Discord user IDs',
      admin: {
        description: 'Comma-separated Discord user IDs permitted to confirm orders.',
      },
    },
  ],
};
```

- [ ] **Step 2: Regenerate Payload types**

Run: `pnpm payload:types`
Expected: `src/payload/payload-types.ts` updates; `NotificationSettingsSelect` now lists `discord*` fields, no `zalo*` fields. Exit code 0.

- [ ] **Step 3: Generate the migration**

Run: `pnpm payload migrate:create discord_notifications`
Expected: a new `src/migrations/<timestamp>.ts` + `.json` are created and `src/migrations/index.ts` gains the new entry. The SQL drops the `zalo_*` columns and adds the `discord_*` columns on the `notification_settings` table.

If the command cannot reach the database in this environment, do not stop — note it in the commit body and continue; the migration file generation is the deliverable.

- [ ] **Step 4: Type-check**

Run: `pnpm check-types`
Expected: PASS (exit 0). The Zalo lib still compiles — its `NotificationGlobalShape` is a local interface, so removing the fields does not break it yet.

- [ ] **Step 5: Commit**

```bash
git add src/payload/globals/NotificationSettings.ts src/payload/payload-types.ts src/migrations/
git commit -m "feat(notifications): replace Zalo config with Discord fields on global"
```

---

## Task 2: Discord message builder (embed + button)

**Files:**
- Create: `lib/discord/order-notification.ts`
- Test: `lib/__tests__/discord-order-message.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/discord-order-message.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { buildOrderEmbed, buildConfirmComponents } from '@/lib/discord/order-notification';

function sampleOrder(): Order {
  return {
    id: 42,
    orderId: '1007',
    totalAmount: 250000,
    currency: 'VND',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    paymentMethodKey: 'cod',
    lineItems: [
      { productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 100000 },
      { productId: 'p2', productTitle: 'Nón', quantity: 1, unitPrice: 50000 },
    ],
  } as Order;
}

describe('buildOrderEmbed', () => {
  it('should put the order code in the title and VND-formatted total in a field', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.title).toContain('#1007');
    const total = embed.fields?.find((f) => f.name === 'Tổng tiền');
    expect(total?.value).toBe('250.000₫');
  });

  it('should include customer name and phone fields when present', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const flat = JSON.stringify(embed.fields);
    expect(flat).toContain('Nguyễn Văn A');
    expect(flat).toContain('0901234567');
  });

  it('should list every line item with quantity', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const items = embed.fields?.find((f) => f.name === 'Sản phẩm');
    expect(items?.value).toContain('Áo thun x2');
    expect(items?.value).toContain('Nón x1');
  });

  it('should link the embed to the admin order page', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.url).toContain('/admin/collections/orders/42');
  });
});

describe('buildConfirmComponents', () => {
  it('should encode the order doc id in the button custom_id', () => {
    const components = buildConfirmComponents(sampleOrder());
    const button = components[0].components[0];
    expect(button.custom_id).toBe('confirm_order:42');
    expect(button.label).toContain('Xác nhận');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/discord-order-message.test.ts`
Expected: FAIL — cannot resolve `@/lib/discord/order-notification`.

- [ ] **Step 3: Write the builder**

Create `lib/discord/order-notification.ts`:

```ts
// lib/discord/order-notification.ts — build the seller's new-order Discord message
import type { Payload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { absoluteUrl } from '@/lib/utils';
import { getDiscordConfig, isDiscordConfigComplete, sendChannelMessage } from '@/lib/discord/client';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  url: string;
  color: number;
  fields: DiscordEmbedField[];
}

export interface DiscordButton {
  type: 2;
  style: 1;
  label: string;
  custom_id: string;
}

export interface DiscordActionRow {
  type: 1;
  components: DiscordButton[];
}

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}₫`;
}

export function buildOrderEmbed(order: Order): DiscordEmbed {
  const fields: DiscordEmbedField[] = [];
  fields.push({ name: 'Tổng tiền', value: formatVnd(order.totalAmount), inline: true });
  if (order.customerName) fields.push({ name: 'Khách', value: order.customerName, inline: true });
  if (order.phoneNumber) fields.push({ name: 'SĐT', value: order.phoneNumber, inline: true });

  const payment = order.paymentMethodKey ?? order.paymentKind ?? 'N/A';
  fields.push({ name: 'Thanh toán', value: payment, inline: true });

  const items = order.lineItems ?? [];
  if (items.length > 0) {
    const lines = items.map((item) => `• ${item.productTitle ?? item.productId} x${item.quantity}`);
    fields.push({ name: 'Sản phẩm', value: lines.join('\n') });
  }

  return {
    title: `🛒 Đơn hàng mới #${order.orderId}`,
    url: absoluteUrl(`/admin/collections/orders/${order.id}`),
    color: 0x22c55e,
    fields,
  };
}

export function buildConfirmComponents(order: Order): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: '✅ Xác nhận đơn', custom_id: `confirm_order:${order.id}` },
      ],
    },
  ];
}

export async function notifyNewOrder(args: { payload: Payload; order: Order }): Promise<void> {
  const { payload, order } = args;
  const config = await getDiscordConfig(payload);
  if (!config.enabled || !isDiscordConfigComplete(config)) return;
  await sendChannelMessage(config, {
    embeds: [buildOrderEmbed(order)],
    components: buildConfirmComponents(order),
  });
}
```

Note: `notifyNewOrder` imports from `lib/discord/client` which is created in Task 4. The builder tests in this task do not import `notifyNewOrder`, so they pass now. Type-check is deferred to Task 4.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/discord-order-message.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/discord/order-notification.ts lib/__tests__/discord-order-message.test.ts
git commit -m "feat(notifications): add Discord order embed + confirm button builder"
```

---

## Task 3: Ed25519 signature verification

**Files:**
- Create: `lib/discord/verify.ts`
- Test: `lib/__tests__/discord-verify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/discord-verify.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyDiscordSignature } from '@/lib/discord/verify';

function makeSignedRequest(body: string, timestamp: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');
  const rawPublicKey = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');
  return { signature, rawPublicKey };
}

describe('verifyDiscordSignature', () => {
  it('should return true for a correctly signed request', () => {
    const body = '{"type":1}';
    const timestamp = '1700000000';
    const { signature, rawPublicKey } = makeSignedRequest(body, timestamp);
    expect(
      verifyDiscordSignature({ rawBody: body, signature, timestamp, publicKey: rawPublicKey }),
    ).toBe(true);
  });

  it('should return false when the body is tampered', () => {
    const timestamp = '1700000000';
    const { signature, rawPublicKey } = makeSignedRequest('{"type":1}', timestamp);
    expect(
      verifyDiscordSignature({
        rawBody: '{"type":3}',
        signature,
        timestamp,
        publicKey: rawPublicKey,
      }),
    ).toBe(false);
  });

  it('should return false for a malformed signature instead of throwing', () => {
    expect(
      verifyDiscordSignature({
        rawBody: '{}',
        signature: 'zzzz',
        timestamp: '1',
        publicKey: 'abcd',
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/discord-verify.test.ts`
Expected: FAIL — cannot resolve `@/lib/discord/verify`.

- [ ] **Step 3: Write the implementation**

Create `lib/discord/verify.ts`:

```ts
// lib/discord/verify.ts — verify Discord interaction request signatures (Ed25519)
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

// DER SPKI header for an Ed25519 public key, followed by the 32-byte raw key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export interface VerifyArgs {
  rawBody: string;
  signature: string; // hex, from X-Signature-Ed25519
  timestamp: string; // from X-Signature-Timestamp
  publicKey: string; // hex, the app public key
}

export function verifyDiscordSignature(args: VerifyArgs): boolean {
  try {
    const keyDer = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(args.publicKey, 'hex')]);
    const key = createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
    return cryptoVerify(
      null,
      Buffer.from(args.timestamp + args.rawBody),
      key,
      Buffer.from(args.signature, 'hex'),
    );
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/discord-verify.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/discord/verify.ts lib/__tests__/discord-verify.test.ts
git commit -m "feat(notifications): add Ed25519 verification for Discord interactions"
```

---

## Task 4: Discord client + wire notifyNewOrder

**Files:**
- Create: `lib/discord/client.ts`
- Test: add to `lib/__tests__/discord-order-message.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/discord-order-message.test.ts`:

```ts
import { vi } from 'vitest';
import type { Payload } from 'payload';
import { notifyNewOrder } from '@/lib/discord/order-notification';

describe('notifyNewOrder', () => {
  it('should not call fetch when Discord notifications are disabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const payload = {
      findGlobal: vi.fn().mockResolvedValue({ discordEnabled: false }),
    } as unknown as Payload;

    await notifyNewOrder({ payload, order: sampleOrder() });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('should POST to the channel messages endpoint with a Bot token when enabled', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = {
      findGlobal: vi.fn().mockResolvedValue({
        discordEnabled: true,
        discordBotToken: 'tok',
        discordChannelId: '999',
        discordPublicKey: 'pk',
        discordAllowedUserIds: '1',
      }),
    } as unknown as Payload;

    await notifyNewOrder({ payload, order: sampleOrder() });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://discord.com/api/v10/channels/999/messages');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bot tok');
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/discord-order-message.test.ts`
Expected: FAIL — cannot resolve `@/lib/discord/client`.

- [ ] **Step 3: Write the client**

Create `lib/discord/client.ts`:

```ts
// lib/discord/client.ts — Discord bot config + channel message send
import type { Payload } from 'payload';
import type { DiscordEmbed, DiscordActionRow } from '@/lib/discord/order-notification';

const API_BASE = 'https://discord.com/api/v10';

export interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  channelId: string;
  publicKey: string;
  allowedUserIds: string[];
}

interface NotificationGlobalShape {
  discordEnabled?: boolean | null;
  discordBotToken?: string | null;
  discordChannelId?: string | null;
  discordPublicKey?: string | null;
  discordAllowedUserIds?: string | null;
}

function parseIds(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getDiscordConfig(payload: Payload): Promise<DiscordConfig> {
  const g = (await payload.findGlobal({
    slug: 'notification-settings',
  })) as NotificationGlobalShape;
  return {
    enabled: Boolean(g.discordEnabled),
    botToken: g.discordBotToken ?? '',
    channelId: g.discordChannelId ?? '',
    publicKey: g.discordPublicKey ?? '',
    allowedUserIds: parseIds(g.discordAllowedUserIds),
  };
}

export function isDiscordConfigComplete(config: DiscordConfig): boolean {
  return Boolean(config.botToken && config.channelId && config.publicKey);
}

export interface ChannelMessagePayload {
  embeds: DiscordEmbed[];
  components: DiscordActionRow[];
}

export async function sendChannelMessage(
  config: DiscordConfig,
  message: ChannelMessagePayload,
): Promise<void> {
  const res = await fetch(`${API_BASE}/channels/${config.channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${config.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`[discord] send failed: ${res.status} ${detail}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/discord-order-message.test.ts`
Expected: PASS — all builder + `notifyNewOrder` tests green.

- [ ] **Step 5: Type-check**

Run: `pnpm check-types`
Expected: PASS — `order-notification.ts` now resolves its `client` import.

- [ ] **Step 6: Commit**

```bash
git add lib/discord/client.ts lib/__tests__/discord-order-message.test.ts
git commit -m "feat(notifications): add Discord bot client and wire notifyNewOrder"
```

---

## Task 5: Interactions endpoint route

**Files:**
- Create: `app/api/discord/interactions/route.ts`
- Test: `lib/__tests__/discord-interactions.test.ts`

The route imports `confirmOrder` from `lib/order-fulfillment` (returns `{ ok: true; order: { orderCode } } | { ok: false; message }`). Discord interaction types: request `1`=PING, `3`=MESSAGE_COMPONENT; response `1`=PONG, `4`=CHANNEL_MESSAGE_WITH_SOURCE, `7`=UPDATE_MESSAGE; message flag `64`=EPHEMERAL.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/discord-interactions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
const confirmOrderMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('@/lib/discord/verify', () => ({
  verifyDiscordSignature: (...args: unknown[]) => verifyMock(...args),
}));
vi.mock('@/lib/order-fulfillment', () => ({
  confirmOrder: (...args: unknown[]) => confirmOrderMock(...args),
}));
vi.mock('@/lib/discord/client', () => ({
  getDiscordConfig: (...args: unknown[]) => getConfigMock(...args),
}));
vi.mock('@payload-config', () => ({ default: {} }), { virtual: true });
vi.mock('payload', () => ({ getPayload: vi.fn().mockResolvedValue({}) }));

import { POST } from '@/app/api/discord/interactions/route';

function req(body: unknown): Request {
  return new Request('http://localhost/api/discord/interactions', {
    method: 'POST',
    headers: { 'X-Signature-Ed25519': 'sig', 'X-Signature-Timestamp': 'ts' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  verifyMock.mockReset();
  confirmOrderMock.mockReset();
  getConfigMock.mockReset();
  getConfigMock.mockResolvedValue({ publicKey: 'pk', allowedUserIds: ['1'] });
});

describe('POST /api/discord/interactions', () => {
  it('should return 401 when the signature is invalid', async () => {
    verifyMock.mockReturnValue(false);
    const res = await POST(req({ type: 1 }));
    expect(res.status).toBe(401);
    expect(confirmOrderMock).not.toHaveBeenCalled();
  });

  it('should answer PING with PONG', async () => {
    verifyMock.mockReturnValue(true);
    const res = await POST(req({ type: 1 }));
    const json = await res.json();
    expect(json.type).toBe(1);
  });

  it('should reject a user not in the allowlist with an ephemeral message', async () => {
    verifyMock.mockReturnValue(true);
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '999' } },
      }),
    );
    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.flags).toBe(64);
    expect(confirmOrderMock).not.toHaveBeenCalled();
  });

  it('should confirm the order and update the message for an allowed user', async () => {
    verifyMock.mockReturnValue(true);
    confirmOrderMock.mockResolvedValue({ ok: true, order: { orderCode: 'A1' } });
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '1' } },
      }),
    );
    const json = await res.json();
    expect(confirmOrderMock).toHaveBeenCalledWith('42');
    expect(json.type).toBe(7);
    expect(JSON.stringify(json.data)).toContain('Đã xác nhận');
  });

  it('should show the error message when confirmOrder fails', async () => {
    verifyMock.mockReturnValue(true);
    confirmOrderMock.mockResolvedValue({ ok: false, message: 'Đơn hàng đã bị hủy.' });
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '1' } },
      }),
    );
    const json = await res.json();
    expect(json.type).toBe(7);
    expect(JSON.stringify(json.data)).toContain('Đơn hàng đã bị hủy.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/discord-interactions.test.ts`
Expected: FAIL — cannot resolve `@/app/api/discord/interactions/route`.

- [ ] **Step 3: Write the route**

Create `app/api/discord/interactions/route.ts`:

```ts
// app/api/discord/interactions/route.ts — public Discord interactions endpoint
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { verifyDiscordSignature } from '@/lib/discord/verify';
import { getDiscordConfig } from '@/lib/discord/client';
import { confirmOrder } from '@/lib/order-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PONG = { type: 1 };

function ephemeral(content: string) {
  return NextResponse.json({ type: 4, data: { content, flags: 64 } });
}

function updateMessage(content: string) {
  // type 7 = UPDATE_MESSAGE: replace the original, drop the button.
  return NextResponse.json({ type: 7, data: { content, embeds: [], components: [] } });
}

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get('X-Signature-Ed25519') ?? '';
  const timestamp = req.headers.get('X-Signature-Timestamp') ?? '';
  const rawBody = await req.text();

  const payload = await getPayload({ config });
  const discord = await getDiscordConfig(payload);

  const valid = verifyDiscordSignature({
    rawBody,
    signature,
    timestamp,
    publicKey: discord.publicKey,
  });
  if (!valid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as {
    type: number;
    data?: { custom_id?: string };
    member?: { user?: { id?: string } };
  };

  if (interaction.type === 1) {
    return NextResponse.json(PONG);
  }

  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? '';
    if (!customId.startsWith('confirm_order:')) {
      return ephemeral('Hành động không hợp lệ.');
    }

    const userId = interaction.member?.user?.id ?? '';
    if (!discord.allowedUserIds.includes(userId)) {
      return ephemeral('Bạn không có quyền xác nhận đơn này.');
    }

    const docId = customId.slice('confirm_order:'.length);
    const result = await confirmOrder(docId);
    if (!result.ok) {
      return updateMessage(`⚠️ ${result.message}`);
    }
    return updateMessage(`✅ Đã xác nhận đơn #${result.order.orderCode}.`);
  }

  return NextResponse.json({ error: 'unsupported interaction type' }, { status: 400 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/discord-interactions.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/api/discord/interactions/route.ts lib/__tests__/discord-interactions.test.ts
git commit -m "feat(notifications): add Discord interactions endpoint for order confirm"
```

---

## Task 6: Wire the hook and remove Zalo

**Files:**
- Modify: `lib/payload-order-hooks.ts:6`
- Delete: `lib/zalo/oa-client.ts`, `lib/zalo/order-notification.ts`
- Delete: `lib/__tests__/zalo-order-notification.test.ts`, `lib/__tests__/zalo-order-message.test.ts`, `lib/__tests__/zalo-oa-client.test.ts`

- [ ] **Step 1: Swap the import in the order hook**

In `lib/payload-order-hooks.ts`, change line 6 from:

```ts
import { notifyNewOrder } from '@/lib/zalo/order-notification';
```

to:

```ts
import { notifyNewOrder } from '@/lib/discord/order-notification';
```

The `notifySellerOnNewOrder` hook body is unchanged — `notifyNewOrder({ payload, order })` has the same signature.

- [ ] **Step 2: Update the stale comment**

In `lib/payload-order-hooks.ts`, change the doc comment above `notifySellerOnNewOrder` from `Notify the seller on Zalo when a brand-new order is created.` to `Notify the seller on Discord when a brand-new order is created.` and update the `console.warn` tag from `zalo notify failed` to `discord notify failed`.

- [ ] **Step 3: Delete the Zalo code and tests**

```bash
git rm lib/zalo/oa-client.ts lib/zalo/order-notification.ts \
  lib/__tests__/zalo-order-notification.test.ts \
  lib/__tests__/zalo-order-message.test.ts \
  lib/__tests__/zalo-oa-client.test.ts
```

- [ ] **Step 4: Verify no remaining references to the Zalo module**

Run: `grep -rn "lib/zalo\|notifyNewOrder" lib/ app/ src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: every `notifyNewOrder` reference points at `lib/discord/order-notification`; no `lib/zalo` import remains.

- [ ] **Step 5: Full test + type-check**

Run: `pnpm test && pnpm check-types`
Expected: PASS — all Discord tests green, no Zalo test files, types clean.

- [ ] **Step 6: Commit**

```bash
git add lib/payload-order-hooks.ts lib/zalo lib/__tests__
git commit -m "feat(notifications): switch order hook to Discord, remove Zalo"
```

---

## Task 7: Document operator setup

**Files:**
- Modify: `CLAUDE.md` (or create `docs/discord-notifications-setup.md`)

- [ ] **Step 1: Add the setup steps**

Create `docs/discord-notifications-setup.md`:

```markdown
# Discord Order Notifications — Operator Setup

One-time setup so new orders post to Discord with a confirm button.

1. Create a Discord application at https://discord.com/developers/applications.
2. Under **Bot**, add a bot and copy its **token**.
3. Invite the bot to your server with the **Send Messages** permission.
4. Copy these into Payload admin → Settings → Notification settings:
   - Bot token (step 2)
   - Channel ID (right-click the target channel → Copy Channel ID; requires Developer Mode)
   - Application public key (app → General Information → Public Key)
   - Allowed Discord user IDs (comma-separated; right-click a user → Copy User ID)
   - Tick **Enable Discord order notifications**.
5. In the app → General Information, set **Interactions Endpoint URL** to
   `https://<your-domain>/api/discord/interactions`. Discord sends a validation
   PING; the endpoint answers it automatically.
```

- [ ] **Step 2: Commit**

```bash
git add docs/discord-notifications-setup.md
git commit -m "docs(notifications): add Discord setup guide for operators"
```

---

## Self-Review Notes

- **Spec coverage:** config fields (T1), embed+button (T2), Ed25519 verify (T3), bot client + notify (T4), interactions endpoint with allowlist + 3 response paths (T5), hook swap + Zalo removal (T6), operator setup (T7). All spec sections covered.
- **Type consistency:** `DiscordEmbed`/`DiscordActionRow` defined in T2 are imported by T4's client; `DiscordConfig` defined in T4 is consumed by T5 via `getDiscordConfig`; `confirmOrder` returns `{ ok, order.orderCode }` per `lib/order-fulfillment.ts` — matches T5 usage.
- **Response window / deferred handling:** intentionally synchronous (type 7), per spec YAGNI.
