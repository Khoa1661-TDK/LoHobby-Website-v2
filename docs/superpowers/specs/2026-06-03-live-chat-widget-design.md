# Live Chat Widget (Zalo OA + Facebook Messenger) — Design

**Date:** 2026-06-03
**Status:** Approved (design); pending implementation plan
**Branch:** feature/first-party-analytics (chat work to land on its own branch)

## Goal

Add a storefront live customer-support chat widget that embeds the **official**
Zalo OA chat SDK and the Facebook Messenger Chat Plugin, configurable from the
Payload `StoreSettings` admin global.

## Locked Decisions

1. **Embedded official SDKs** (not link-out bubbles). Chat happens in-page via the
   vendors' own iframes/widgets.
2. **Config in StoreSettings admin** — shop owners set the Zalo OA ID and Facebook
   Page ID in `/admin`; no redeploy needed. Cached + revalidated like the rest of
   the global.
3. **Always load** — the SDKs load on every storefront page regardless of cookie
   consent.
   - Trade-off (acknowledged by user): this loads Facebook/Zalo third-party
     cookies before consent, which diverges from how `Analytics` is gated behind
     `hasAnalyticsConsent()`. Acceptable for a VN-focused shop treating chat as a
     functional feature. Per-platform enable toggles let either be turned off
     centrally. Revisit if expanding to EU/GDPR markets.
4. **Both bubbles stacked, both visible** when Zalo and Messenger are both enabled.

## Non-Goals

- No unified custom launcher coordinating both SDKs (the Zalo SDK exposes no clean
  programmatic open API; a custom launcher would be fragile).
- No consent gating (see decision 3).
- No chat history / CRM integration — chat lives entirely in the vendor apps.

## Architecture

```
StoreSettings global ("Live chat" tab)
      │  afterChange → revalidateStoreSettingsCache()  (existing hook)
      ▼
lib/store-settings.ts  →  resolve() adds normalized `chat` object
      │                   getChatConfig() → (await getStoreSettings()).chat
      ▼
app/(storefront)/layout.tsx  →  <LiveChatWidget config={chat} />
      ▼
components/chat/live-chat-widget.tsx ('use client')
      │  next/script (strategy="lazyOnload")
      ├── Facebook Chat Plugin  (#fb-root, .fb-customerchat[page_id], fbAsyncInit)
      └── Zalo OA widget        (.zalo-chat-widget[data-oaid])
      ▼
app/globals.css  →  stacking offsets so the two bubbles don't overlap
```

## Components / Files

### 1. `src/payload/globals/StoreSettings.ts`
Add a **"Live chat"** tab (sibling of "Contact & checkout") with:

| Field | Type | Notes |
|-------|------|-------|
| `chatEnabled` | checkbox | Master switch, default `false` |
| `zaloChatEnabled` | checkbox | default `false` |
| `zaloOaId` | text | Zalo Official Account ID |
| `zaloWelcomeMessage` | text | Optional welcome text |
| `messengerChatEnabled` | checkbox | default `false` |
| `fbPageId` | text | Facebook Page ID |
| `messengerThemeColor` | text | hex, optional (plugin accent) |
| `messengerGreeting` | text | Optional greeting line |

Admin descriptions explain the FB domain-whitelisting requirement and where to
find each ID. No change to the existing `afterChange` revalidation hook.

### 2. `lib/store-settings.ts`
- Add `chat` fields to `RawStoreSettings`.
- Add a `ChatConfig` type and a `chat: ChatConfig` member to `ResolvedStoreSettings`.
- Add chat defaults (all disabled, empty IDs) to `DEFAULTS`.
- Extend `resolve()` to normalize chat:
  - trim IDs;
  - coerce toggles to booleans;
  - **a platform is treated as off if its ID is blank, even when its toggle is on**;
  - whole widget off when `chatEnabled` is false.
- Export `async function getChatConfig(): Promise<ChatConfig>` returning
  `(await getStoreSettings()).chat`.

`ChatConfig` shape:
```ts
type ChatConfig = {
  enabled: boolean;            // master
  zalo: { enabled: boolean; oaId: string; welcomeMessage: string } | null;
  messenger: { enabled: boolean; pageId: string; themeColor: string; greeting: string } | null;
};
```
`zalo` / `messenger` are `null` when not usable (disabled or missing ID), so the
component logic is a simple null check.

### 3. `components/chat/live-chat-widget.tsx` (`'use client'`)
- Props: `{ config: ChatConfig }`.
- Returns `null` immediately if `!config.enabled || (!config.zalo && !config.messenger)`.
- **Facebook**: render `<div id="fb-root" />` + `<div class="fb-customerchat" page_id greeting_dialog_display="hide" theme_color>`; set `window.fbAsyncInit` to call `FB.init({ xfbml: true, version: 'v19.0' })`; load
  `https://connect.facebook.net/vi_VN/sdk/xfbml.customerchat.js` via `next/script`
  `strategy="lazyOnload"`.
- **Zalo**: render `<div class="zalo-chat-widget" data-oaid data-welcome-message
  data-autopopup="0">`; load `https://sp.zalo.me/plugins/sdk.js` via `next/script`
  `strategy="lazyOnload"`.
- Each platform block is conditional on its config member being non-null.

### 4. `app/globals.css`
Stacking rules so bubbles don't overlap when both are present:
- Zalo widget stays at default bottom-right corner.
- Shift the Messenger launcher (`.fb_dialog`, `.fb-customerchat` iframe) up
  ~76px so it sits above the Zalo bubble.
- Respect mobile safe-area insets.

### 5. `app/(storefront)/layout.tsx`
- `const chat = await getChatConfig();`
- Render `<LiveChatWidget config={chat} />` next to `CookieConsent` /
  `PwaInstallPrompt`.

### 6. Types
- Run Payload type generation (`pnpm payload generate:types` or project
  equivalent) to update `src/payload/payload-types.ts` with the new fields.

## Data Flow

1. Admin edits the Live chat tab in `/admin` → Payload `afterChange` fires
   `revalidateStoreSettingsCache()` (existing).
2. Next request: `getStoreSettings()` (cached, tag `store-settings`) returns fresh
   data; `getChatConfig()` reads the normalized `chat` object.
3. Layout passes it to `<LiveChatWidget>`; the client component lazy-injects only
   the enabled SDKs.

## Error Handling / Edge Cases

- **Master off / no IDs** → component renders nothing; no scripts loaded.
- **Toggle on but ID blank** → resolver nulls that platform; nothing renders for it.
- **Lazy load** (`lazyOnload`) → chat never blocks first paint / LCP.
- **Facebook domain whitelisting** — REQUIRED ONE-TIME MANUAL STEP: in the Facebook
  Page settings (Inbox → Chat Plugin → Whitelisted Domains) add the storefront
  domain (and `localhost` for dev). Without it the Messenger plugin will not show.
  Documented here and in `DECISIONS.md`; cannot be automated.
- **SDK script failure** → vendor scripts fail silently; the rest of the page is
  unaffected (independent `next/script` tags).

## Testing

Per testing rules — unit-test the logic we own, not third-party SDK glue.

`lib/__tests__/store-settings.test.ts` (new or extended), Vitest:
- should disable the whole widget when `chatEnabled` is false
- should null the zalo platform when `zaloChatEnabled` is true but `zaloOaId` is blank
- should null the messenger platform when enabled but `fbPageId` is blank
- should trim whitespace from `zaloOaId` / `fbPageId`
- should return both platforms when both are enabled with valid IDs
- should fall back to chat defaults (all off) when the global is empty/null

The `<LiveChatWidget>` component is primarily third-party `next/script` glue and is
not unit-tested (would only assert on vendor markup).

## Decision Log Entry (to add to DECISIONS.md)

`2026-06-03 — Live chat via embedded Zalo/Messenger SDKs, always-loaded`
covering: embedded SDKs over link-out; StoreSettings admin config; always-load vs
consent-gated (with the privacy trade-off); FB domain-whitelisting manual step.

## Out of Scope / Future

- Consent-gated loading for EU markets.
- Analytics events on chat-open.
- Business-hours / offline messaging.
