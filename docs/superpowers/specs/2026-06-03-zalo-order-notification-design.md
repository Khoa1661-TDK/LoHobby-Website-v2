# Zalo Order Notification — Design

**Date:** 2026-06-03
**Status:** Approved
**Branch:** `feature/zalo-order-notifications`

## Goal

When a new order is placed in the storefront, send a Zalo message to the seller (shop owner) so they learn about the order without watching the admin panel.

## Decisions (from brainstorming)

- **Channel:** Zalo Official Account (OA) message sent to the seller's Zalo user id. The seller follows/chats with the shop's OA and receives a normal message per order. Free; subject to Zalo's consultation-message window.
- **Trigger:** On order **creation** (status `pending`), for every order regardless of payment method or payment state.
- **Config storage:** Admin-managed Payload **global**. The non-technical seller configures it from the admin panel.
- **Message content:** order code + total (VND), customer name + phone, line items (title × qty), payment method, and a link to the order in the admin panel — Vietnamese, matching existing app copy.

## Zalo OA Mechanics (the driving constraint)

- **Send:** `POST https://openapi.zalo.me/v3.0/oa/message/cs` with header `access_token`, JSON body `{ recipient: { user_id }, message: { text } }`.
- **Token lifecycle:** the access token expires in ~25h. Refreshing via `POST https://oauth.zaloapp.com/v4/oa/access_token` (`grant_type=refresh_token`, header `secret_key: <appSecret>`, form fields `app_id`, `refresh_token`) returns a **new access token AND a new refresh token; the old refresh token is invalidated**.
- **Implication:** the refresh token must be persisted and overwritten on every refresh. This is why config lives in a writable global, not an env var.

## Architecture (Payload `afterChange` hook + dedicated Zalo module)

Chosen over (B) calling the notifier directly from the checkout route — fragile, misses non-checkout order sources — and (C) a polling queue — over-engineered for a single-seller ping.

### Components

1. **`NotificationSettings` global** — `src/payload/globals/NotificationSettings.ts`
   - Admin-entered: `zaloEnabled` (checkbox), `zaloAppId`, `zaloAppSecret`, `zaloRecipientUserId`, `zaloRefreshToken` (pasted once after OAuth onboarding).
   - App-managed (read-only in admin): `zaloAccessToken`, `zaloTokenExpiresAt`.
   - Admin-only access. Registered in `payload.config.ts` globals array.

2. **`lib/zalo/oa-client.ts`**
   - `getValidAccessToken(payload)` — reads the global; if the access token is missing or within a refresh margin of expiry, refreshes it, persists the rotated access **and** refresh tokens + new expiry back to the global, and returns the valid token. A short in-process lock/promise guard avoids concurrent double-refresh.
   - `sendOaMessage(payload, text)` — gets a valid token and POSTs the consultation message to the recipient user id. Throws on non-OK Zalo responses (caller logs).

3. **`lib/zalo/order-notification.ts`**
   - `buildOrderMessage(order)` — **pure** function returning the Vietnamese message string from order fields (`orderId`/order code, `totalAmount`, `customerName`, `phoneNumber`, `lineItems[]`, `paymentMethodKey`/`paymentKind`, admin order URL via existing absolute-url helper).
   - `notifyNewOrder({ payload, order })` — no-ops if `zaloEnabled` is false or config incomplete; otherwise builds the message and calls `sendOaMessage`. Catches and logs its own errors so callers never throw.

4. **Hook `notifySellerOnNewOrder`** — added to `lib/payload-order-hooks.ts` and wired into `Orders.afterChange`.
   - Fires only when `operation === 'create'`.
   - Fire-and-forget: `void notifyNewOrder(...).catch(warn)` — never blocks or fails order creation. Mirrors the existing `syncOrderInventoryOnStatusChange` pattern.

### Data Flow

```
checkout API / admin create order
  → Payload Orders.afterChange (operation === 'create')
    → notifySellerOnNewOrder (background, non-blocking)
      → notifyNewOrder: check enabled → buildOrderMessage
        → sendOaMessage → getValidAccessToken (refresh + persist if needed)
          → POST Zalo OA message → seller's Zalo
```

## Error Handling & Observability

- Notification failure NEVER blocks or fails order creation (fire-and-forget + catch).
- Logged with context: `console.warn('[orders] zalo notify failed', { orderId, err })`.
- Disabled or incomplete config → quiet no-op (single info log at most).
- Token-refresh failure logged distinctly (`[zalo] token refresh failed`) so an expired/invalidated refresh token is diagnosable without guessing.
- Secrets (app secret, tokens) are never logged.

## Testing

- `buildOrderMessage` (pure): sample order → message contains order code, VND-formatted total, customer name + phone, every line item, payment method, admin link.
- Token refresh (mocked `fetch`): refreshes when expired and persists the rotated refresh token; skips refresh when token still valid; surfaces error on refresh failure.
- `notifyNewOrder`: no-ops when disabled / config incomplete.

## Onboarding (documented for the seller)

One-time: complete Zalo OA OAuth to obtain the initial refresh token, then in the admin **Notification Settings** global enter App ID, App Secret, the seller's recipient user id, and the refresh token, and toggle Zalo notifications on. Tokens auto-rotate thereafter.

## Out of Scope (YAGNI)

- Customer-facing Zalo messages (ZNS), notifications on payment/shipping status changes, retry queues, and multi-recipient/team notifications. These can be layered on later if needed.

## Security Note

The OA app secret and tokens are stored in plaintext in the admin-managed global (per the chosen config approach). Access is restricted to admin users. If stronger protection is wanted later, reuse the existing `PAYMENT_SECRETS_KEY` encryption pattern (`lib/payment-secrets.ts`) to encrypt these fields at rest — flagged as a follow-up, not done now.
