# Discord Order Notifications — Design

**Date:** 2026-06-11
**Status:** Approved
**Supersedes:** Zalo Official Account order notifications (removed)

## Goal

Replace the seller's Zalo order notification with a Discord notification that lets
the seller **confirm a new order directly from inside Discord** by pressing a
button. Confirming reuses the existing `confirmOrder()` logic
(`orderStatus → processing`, sets `confirmedAt`).

## Why this shape

Sending a Discord message that carries an interactive button requires the message
to be sent by a **bot application** — plain incoming webhooks cannot carry message
components. Handling the button press requires a **public interactions endpoint**
that verifies Discord's Ed25519 request signature. The design therefore has two
halves: outbound (notify) and inbound (confirm).

## Architecture

### Outbound flow
Order `create` → existing `notifySellerOnNewOrder` afterChange hook (unchanged,
fire-and-forget) → `notifyNewOrder()` (Discord) → bot POSTs an embed + confirm
button to the configured channel.

### Inbound flow
Seller clicks "✅ Xác nhận đơn" → Discord POSTs to `/api/discord/interactions` →
verify Ed25519 signature (else `401`) → check the pressing user is in the
allowlist (else ephemeral reject) → parse `confirm_order:<docId>` →
`confirmOrder(docId)` → respond type 7 (UPDATE_MESSAGE) editing the embed to
"✅ Đã xác nhận", button removed.

## Components

| Piece | Purpose |
|---|---|
| `NotificationSettings` global | Drop all `zalo*` fields → add Discord fields (below) |
| `lib/discord/client.ts` | POST a message to a channel via bot API (`POST /channels/{id}/messages`, `Authorization: Bot <token>`) |
| `lib/discord/order-notification.ts` | Build embed + confirm button (`custom_id: confirm_order:<docId>`); `notifyNewOrder()` |
| `lib/discord/verify.ts` | Ed25519 verification via Node `crypto.verify('ed25519', …)` — no new dependency |
| `app/api/discord/interactions/route.ts` | Public endpoint: verify sig → PING (type 1) → button press handling |
| `lib/payload-order-hooks.ts` | Swap import `zalo/order-notification` → `discord/order-notification` (one line) |
| **Deleted** | `lib/zalo/oa-client.ts`, `lib/zalo/order-notification.ts`, and the 3 Zalo test files |
| Payload migration | Drop `zalo*` columns, add `discord*` columns on the global |

## NotificationSettings fields (Discord)

| Field | Type | Notes |
|---|---|---|
| `discordEnabled` | checkbox | default `false` |
| `discordBotToken` | text | bot token; sends messages |
| `discordChannelId` | text | channel to post order notifications |
| `discordPublicKey` | text | app's Ed25519 public key; verifies button presses |
| `discordAllowedUserIds` | text | comma-separated Discord user IDs allowed to confirm |

`notifyNewOrder()` no-ops unless `discordEnabled` is true and bot token + channel
id are present (mirrors the old `isConfigComplete` guard).

## Message format

Rich embed:
- Title: `🛒 Đơn hàng mới #<orderId>`
- Colored sidebar
- Fields: total (VND-formatted via existing `formatVnd`), customer name, phone,
  payment method
- Line-items list (`• <productTitle> x<qty>`)
- Markdown "Xem đơn" link to the admin order page (existing `absoluteUrl` helper)
- Action row with one button: label "✅ Xác nhận đơn", `custom_id`
  `confirm_order:<docId>`

## Security

### Signature verification (required by Discord)
Every interaction request carries `X-Signature-Ed25519` and
`X-Signature-Timestamp` headers. The endpoint verifies `timestamp + rawBody`
against the stored `discordPublicKey`. Invalid/missing → `401`, no processing.

**Implementation note:** the route MUST read the **raw** request body (not parsed
JSON) for verification, then parse afterward. Use `await req.text()` and parse
manually.

### Authorization — allowlist
After a valid signature, the request genuinely came from Discord, but any channel
member could press the button. The handler parses `discordAllowedUserIds` and
checks `interaction.member.user.id`. Not in the list → respond type 4 with an
**ephemeral** message ("Bạn không có quyền xác nhận đơn này."), order untouched.

### Response window
Discord requires a reply within 3 seconds. `confirmOrder()` is a couple of DB ops,
comfortably under that, so the handler responds **synchronously** with type 7
(edit the message). Deferred handling (type 6 + followup PATCH) is intentionally
NOT built; revisit only if confirmation proves slow.

### Idempotency / errors
`confirmOrder()` already guards re-confirmation ("Đơn hàng đã được xác nhận trước
đó") and cancellation. On any non-ok result, the handler edits the message to show
the Vietnamese error instead of success — a double-click or stale button gives
clear feedback, not a silent failure. Outbound send failures stay fire-and-forget
(logged via `console.warn`, never block order creation), same as current behavior.

## Testing (Vitest)

- `discord-order-message.test.ts` — embed/button structure, VND formatting,
  `custom_id` encodes the docId
- `discord-verify.test.ts` — valid signature passes; tampered body/timestamp fails
- `discord-interactions.test.ts` — PING→PONG; valid confirm → `confirmOrder` called
  + UPDATE_MESSAGE; non-allowlisted user → ephemeral reject; bad signature → 401

## Manual setup (one-time, done in Discord, documented for the operator)

1. Create a Discord application + bot.
2. Invite the bot to the server with **Send Messages** permission.
3. Copy bot token, channel ID, and the app's public key into Notification
   settings; add allowed Discord user IDs.
4. Set the **Interactions Endpoint URL** in the Discord Developer Portal to
   `https://<your-domain>/api/discord/interactions`. Discord sends a validation
   PING — the PING handler answers it.

## Out of scope (YAGNI)

Slash commands, multi-channel routing, message editing beyond the confirm action,
deferred-response handling, keeping Zalo as a fallback.
