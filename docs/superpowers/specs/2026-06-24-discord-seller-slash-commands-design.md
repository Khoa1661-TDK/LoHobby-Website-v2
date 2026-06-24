# Discord Seller Slash Commands — Design

Date: 2026-06-24
Status: Approved (design); pending implementation plan

## Goal

Give the seller a set of staff-only Discord slash commands to view and manage
orders without leaving Discord, building on the existing order-notification +
confirm-button integration (`lib/discord/`, `app/api/discord/interactions/route.ts`).

## Context / Existing State

- An HTTP interactions endpoint already exists at
  `app/api/discord/interactions/route.ts`. It handles interaction `type 1` (PING
  → PONG) and `type 3` (message component — the existing `confirm_order:` button).
  It does **not** yet handle `type 2` (application commands / slash commands).
- Config lives in the Payload global `notification-settings`
  (`src/payload/globals/NotificationSettings.ts`): `discordEnabled`,
  `discordBotToken`, `discordChannelId`, `discordPublicKey`,
  `discordAllowedUserIds`. Read via `getDiscordConfig()` in `lib/discord/client.ts`.
- Signature verification: `lib/discord/verify.ts` (Ed25519).
- Order data layer: `lib/payload-orders.ts` (`getPayloadOrderByCode`,
  `updatePayloadOrderStatus`, `payload.find`) and the fulfillment layer
  `lib/order-fulfillment.ts` (`markOrderAsPaid`, `confirmOrder`, `assignShipment`,
  `syncOrderShipment`, `cancelOrder`, `refundOrder`, `markOrderDelivered`,
  `listOrdersForFulfillment`).
- Valid transitions per stage: `availableActions(order)` in
  `lib/order-transitions.ts` (pure function). Action labels in `ACTION_LABELS`.
- The app deploys as a long-running Node server (`next start` in Docker), so there
  is no serverless cold start; the Discord 3-second interaction window is
  comfortable and responses are synchronous (no deferred-response flow needed).

## Decisions

- **Audience:** staff-only, single guild. Every command and button action is gated
  on `discordAllowedUserIds` (same allow-list as the existing confirm button).
- **Registration:** guild-scoped commands (instant propagation) via a new
  `scripts/discord-register-commands.ts`. Requires Application ID + Guild ID,
  stored as new fields on the `notification-settings` global.
- **Ship action:** rendered as a link button to the order in `/admin` (the carrier
  picker lives there). All other transitions are one-click buttons. No Discord
  modal in v1.
- **Response style:** command replies are ephemeral (`flags: 64`) — visible only to
  the seller who ran the command. Button actions use `type 7` (UPDATE_MESSAGE).

## Commands (v1)

1. `/orders [status] [limit]`
   - Options: `status` (choice: all | pending | processing | shipped | delivered |
     canceled; default all), `limit` (integer, default 10, max 25).
   - Lists recent orders sorted by `-createdAt`. Each row: `#orderId · customerName
     · formatted total · orderStatus · relative age`.
   - Covers both "all orders" and "pending orders".

2. `/order <code>`
   - Option: `code` (string, required) — the order's `orderId`.
   - Looks up via `getPayloadOrderByCode`. Renders a detail embed (line items,
     customer name, phone, shipping address, payment status, fulfillment status,
     total) plus action buttons derived from `availableActions(order)`.
   - Each non-ship action → button `custom_id = order_action:<action>:<docId>`.
   - `ship` → a Discord link button to `/admin/collections/orders/<docId>`.

3. `/sales [period]`
   - Option: `period` (choice: today | week; default today).
   - Aggregates non-canceled orders in the window: count + summed `totalAmount`.
   - Replies with a short summary embed.

## Components

- `app/api/discord/interactions/route.ts` — extend the POST handler: keep `type 1`
  and `type 3`; add `type 2` handling that delegates to the command dispatcher.
  Keep the route thin.
- `lib/discord/commands.ts` *(new)* — dispatcher. Input: the parsed interaction.
  Enforces allow-list, switches on `interaction.data.name`, reads options, calls
  the data/fulfillment layer, returns the Discord response JSON. One handler
  function per command.
- `lib/discord/order-embeds.ts` *(new)* — pure builders: `buildOrdersListEmbed`,
  `buildOrderDetailEmbed`, `buildOrderActionComponents(order)` (from
  `availableActions`, including the ship link button). Reuses the VND formatting
  pattern from `lib/discord/order-notification.ts`.
- `app/api/discord/interactions/route.ts` button handler — extend to parse
  `order_action:<action>:<docId>` and map each `OrderAction` to its fulfillment
  function. The existing `confirm_order:<docId>` custom_id keeps working
  (treated as `confirm`).
- `scripts/discord-register-commands.ts` *(new)* — reads bot token + Application ID
  + Guild ID from the global, PUTs the three command definitions to
  `PUT /applications/{appId}/guilds/{guildId}/commands`. Run manually via the
  node binary (project `pnpm <script>` hits a deps precheck — call
  `node_modules/.bin/...` directly, consistent with the Dockerfile).
- `src/payload/globals/NotificationSettings.ts` — add `discordApplicationId` and
  `discordGuildId` text fields, with admin descriptions. Generate a Payload
  migration for the new columns.

## Data Flow

- Slash command: Discord POST (`type 2`) → route verifies signature → dispatcher
  checks allow-list → queries `lib/payload-orders.ts` / `lib/order-fulfillment.ts`
  → returns `type 4` ephemeral response (embed [+ components for `/order`]).
- Button action: Discord POST (`type 3`) → route verifies signature → allow-list
  check → parse `order_action:<action>:<docId>` → call mapped fulfillment fn →
  `type 7` UPDATE_MESSAGE with the result (success or the Vietnamese error).

## Error Handling

- Invalid signature → 401 (existing behavior).
- User not in allow-list → ephemeral "không có quyền" message.
- Unknown command / unknown action → ephemeral error.
- Order not found → ephemeral message.
- Fulfillment failures → surface `FulfillmentResult.message` (already localized).
- All work completes within the 3s window; no deferred responses in v1.

## Testing

Follow existing `lib/__tests__/discord-*.test.ts` patterns (mock payload +
fulfillment):
- Dispatcher: routes each command name to its handler; rejects non-allow-listed
  users; rejects unknown commands.
- Embed builders: correct fields/rows for a sample order and order list.
- Action mapping: `order_action:<action>:<docId>` parses and maps to the correct
  fulfillment function; legacy `confirm_order:<docId>` still maps to confirm.
- `/sales` aggregation: correct count + total for a fixed set of orders, excluding
  canceled.

## One-Time Setup (after deploy)

1. In `/admin → Settings → Notification settings`: fill Application ID + Guild ID.
2. Re-invite the bot with the `applications.commands` scope (OAuth2 URL Generator).
3. Run `node_modules/.bin/tsx scripts/discord-register-commands.ts` to register the
   guild commands.
4. Commands appear instantly in the guild.

## Out of Scope (v1)

- `/lowstock`, `/find-product` (product-side; add later).
- Discord modals (ship-via-modal); ship goes through `/admin`.
- Customer-facing commands (this integration is staff-only).
