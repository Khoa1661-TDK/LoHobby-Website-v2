# Live Chat Widget (Zalo + Messenger) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a storefront live-chat widget that embeds the official Zalo OA and Facebook Messenger chat SDKs, configured from the Payload `StoreSettings` admin global.

**Architecture:** A `chat` config object is resolved in `lib/store-settings.ts` (via an exported pure helper `resolveChatConfig`), exposed through `getChatConfig()`, and passed from the storefront server layout into a `'use client'` `<LiveChatWidget>` component that lazy-injects each vendor SDK with `next/script`. Both bubbles are stacked via CSS in `app/globals.css`.

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.x globals, TypeScript (strict), `next/script`, Vitest, Tailwind CSS 4.

**Reference spec:** `docs/superpowers/specs/2026-06-03-live-chat-widget-design.md`

**Branch:** Work happens on `main` (per user instruction). Commit only chat-related files in each step — the working tree contains unrelated analytics WIP; never `git add -A`.

---

## File Structure

- `lib/store-settings.ts` (modify) — add `ChatConfig` type, exported `resolveChatConfig()` pure helper, `chat` fields on raw/resolved types + `DEFAULTS`, call helper inside `resolve()`, export `getChatConfig()`.
- `lib/__tests__/store-settings.test.ts` (create) — Vitest unit tests for `resolveChatConfig()`.
- `src/payload/globals/StoreSettings.ts` (modify) — add a "Live chat" tab.
- `src/payload/payload-types.ts` (regenerate) — picks up the new global fields.
- `components/chat/live-chat-widget.tsx` (create) — `'use client'` component embedding both SDKs.
- `app/globals.css` (modify) — stacking offsets for the two bubbles.
- `app/(storefront)/layout.tsx` (modify) — fetch `getChatConfig()` and render `<LiveChatWidget>`.
- `DECISIONS.md` (modify/create) — decision-log entry.

---

## Task 1: ChatConfig type + `resolveChatConfig` pure helper (TDD)

**Files:**
- Modify: `lib/store-settings.ts`
- Test: `lib/__tests__/store-settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/store-settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveChatConfig, type ChatConfig } from '@/lib/store-settings';

describe('resolveChatConfig', () => {
  it('should disable the whole widget when chatEnabled is false', () => {
    const result = resolveChatConfig({
      chatEnabled: false,
      zaloChatEnabled: true,
      zaloOaId: '123',
      messengerChatEnabled: true,
      fbPageId: '456',
    });
    expect(result.enabled).toBe(false);
  });

  it('should null the zalo platform when enabled but oaId is blank', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: '   ',
    });
    expect(result.zalo).toBeNull();
  });

  it('should null the messenger platform when enabled but fbPageId is blank', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      messengerChatEnabled: true,
      fbPageId: '',
    });
    expect(result.messenger).toBeNull();
  });

  it('should trim whitespace from oaId and pageId', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: '  oa-9 ',
      messengerChatEnabled: true,
      fbPageId: ' 42 ',
    });
    expect(result.zalo?.oaId).toBe('oa-9');
    expect(result.messenger?.pageId).toBe('42');
  });

  it('should return both platforms when both are enabled with valid ids', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: 'oa-1',
      zaloWelcomeMessage: 'Xin chào',
      messengerChatEnabled: true,
      fbPageId: 'page-1',
      messengerThemeColor: '#2563eb',
      messengerGreeting: 'Hi there',
    });
    const expected: ChatConfig = {
      enabled: true,
      zalo: { enabled: true, oaId: 'oa-1', welcomeMessage: 'Xin chào' },
      messenger: { enabled: true, pageId: 'page-1', themeColor: '#2563eb', greeting: 'Hi there' },
    };
    expect(result).toEqual(expected);
  });

  it('should fall back to all-off defaults when raw is null', () => {
    const result = resolveChatConfig(null);
    expect(result).toEqual({ enabled: false, zalo: null, messenger: null });
  });

  it('should keep enabled true but both platforms null when ids are missing', () => {
    const result = resolveChatConfig({ chatEnabled: true });
    expect(result.enabled).toBe(true);
    expect(result.zalo).toBeNull();
    expect(result.messenger).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run lib/__tests__/store-settings.test.ts`
Expected: FAIL — `resolveChatConfig` / `ChatConfig` not exported from `@/lib/store-settings`.

- [ ] **Step 3: Add the type and pure helper**

In `lib/store-settings.ts`, after the existing `RawStoreSettings` type, add the chat fields to it:

```ts
type RawStoreSettings = {
  // ...existing fields unchanged...
  chatEnabled?: boolean | null;
  zaloChatEnabled?: boolean | null;
  zaloOaId?: string | null;
  zaloWelcomeMessage?: string | null;
  messengerChatEnabled?: boolean | null;
  fbPageId?: string | null;
  messengerThemeColor?: string | null;
  messengerGreeting?: string | null;
};
```

Then add the exported type and helper (place near the top of the module, after the existing `ResolvedStoreSettings` type):

```ts
export type ChatConfig = {
  enabled: boolean;
  zalo: { enabled: boolean; oaId: string; welcomeMessage: string } | null;
  messenger: {
    enabled: boolean;
    pageId: string;
    themeColor: string;
    greeting: string;
  } | null;
};

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Pure: normalize the raw Live-chat fields into a ChatConfig. */
export function resolveChatConfig(raw: RawStoreSettings | null): ChatConfig {
  const enabled = raw?.chatEnabled === true;

  const oaId = cleanString(raw?.zaloOaId);
  const zalo =
    raw?.zaloChatEnabled === true && oaId.length > 0
      ? { enabled: true, oaId, welcomeMessage: cleanString(raw?.zaloWelcomeMessage) }
      : null;

  const pageId = cleanString(raw?.fbPageId);
  const messenger =
    raw?.messengerChatEnabled === true && pageId.length > 0
      ? {
          enabled: true,
          pageId,
          themeColor: cleanString(raw?.messengerThemeColor),
          greeting: cleanString(raw?.messengerGreeting),
        }
      : null;

  return { enabled, zalo, messenger };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/__tests__/store-settings.test.ts`
Expected: PASS (7 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/store-settings.ts lib/__tests__/store-settings.test.ts
git commit -m "feat(chat): add resolveChatConfig helper and ChatConfig type"
```

---

## Task 2: Integrate chat into the resolver + expose `getChatConfig()`

**Files:**
- Modify: `lib/store-settings.ts`

- [ ] **Step 1: Add `chat` to `ResolvedStoreSettings`**

Add the member to the `ResolvedStoreSettings` type:

```ts
export type ResolvedStoreSettings = {
  // ...existing fields unchanged...
  /** Live-chat widget config (Zalo OA + Facebook Messenger). */
  chat: ChatConfig;
  brandingRaw: Record<string, unknown> | null;
};
```

- [ ] **Step 2: Add chat defaults to `DEFAULTS`**

In the `DEFAULTS` object add (before `brandingRaw`):

```ts
  chat: { enabled: false, zalo: null, messenger: null },
```

- [ ] **Step 3: Call the helper inside `resolve()`**

In the `return { ... }` of `resolve()`, add (before `brandingRaw`):

```ts
    chat: resolveChatConfig(raw),
```

- [ ] **Step 4: Export `getChatConfig()`**

After `getResolvedSiteName()`, add:

```ts
export async function getChatConfig(): Promise<ChatConfig> {
  const settings = await getStoreSettings();
  return settings.chat;
}
```

- [ ] **Step 5: Verify existing tests + typecheck still pass**

Run: `pnpm vitest run lib/__tests__/store-settings.test.ts && pnpm tsc --noEmit`
Expected: tests PASS; no new TypeScript errors from `lib/store-settings.ts`. (Pre-existing errors elsewhere in the WIP tree may appear — confirm none reference `store-settings.ts`.)

- [ ] **Step 6: Commit**

```bash
git add lib/store-settings.ts
git commit -m "feat(chat): expose chat config via getChatConfig and resolver"
```

---

## Task 3: Add the "Live chat" tab to the StoreSettings global

**Files:**
- Modify: `src/payload/globals/StoreSettings.ts`

- [ ] **Step 1: Add the tab**

Inside the `tabs` array, add a new tab object **after** the "Contact & checkout" tab and before "Tax":

```ts
        {
          label: 'Live chat',
          fields: [
            {
              name: 'chatEnabled',
              type: 'checkbox',
              label: 'Enable live chat widget',
              defaultValue: false,
              admin: {
                description: 'Master switch for the floating Zalo / Messenger chat bubbles.',
              },
            },
            {
              name: 'zaloChatEnabled',
              type: 'checkbox',
              label: 'Show Zalo chat',
              defaultValue: false,
              admin: { condition: (_data, sibling) => Boolean(sibling?.chatEnabled) },
            },
            {
              name: 'zaloOaId',
              type: 'text',
              label: 'Zalo Official Account ID',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.zaloChatEnabled),
                description: 'Found in Zalo OA Manager → Settings → OA info.',
              },
            },
            {
              name: 'zaloWelcomeMessage',
              type: 'text',
              label: 'Zalo welcome message',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.zaloChatEnabled),
              },
            },
            {
              name: 'messengerChatEnabled',
              type: 'checkbox',
              label: 'Show Messenger chat',
              defaultValue: false,
              admin: { condition: (_data, sibling) => Boolean(sibling?.chatEnabled) },
            },
            {
              name: 'fbPageId',
              type: 'text',
              label: 'Facebook Page ID',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
                description:
                  'Required. You must also whitelist this site domain in the Facebook Page: Inbox → Chat Plugin → Whitelisted Domains, or the bubble will not appear.',
              },
            },
            {
              name: 'messengerThemeColor',
              type: 'text',
              label: 'Messenger accent color (hex)',
              admin: {
                placeholder: '#2563eb',
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
              },
            },
            {
              name: 'messengerGreeting',
              type: 'text',
              label: 'Messenger greeting',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
              },
            },
          ],
        },
```

- [ ] **Step 2: Typecheck the global**

Run: `pnpm tsc --noEmit`
Expected: no new errors referencing `StoreSettings.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/payload/globals/StoreSettings.ts
git commit -m "feat(chat): add Live chat tab to StoreSettings global"
```

---

## Task 4: Regenerate Payload types

**Files:**
- Regenerate: `src/payload/payload-types.ts`

- [ ] **Step 1: Generate types**

Run: `pnpm payload generate:types`
Expected: command succeeds; `src/payload/payload-types.ts` now contains the new fields (`chatEnabled`, `zaloOaId`, `fbPageId`, etc.) on the `store-settings` global interface.

If `pnpm payload` is not a script, use: `pnpm exec payload generate:types`.

- [ ] **Step 2: Confirm the new fields landed**

Run: `grep -n "fbPageId\|zaloOaId\|chatEnabled" src/payload/payload-types.ts`
Expected: matches found.

- [ ] **Step 3: Commit**

```bash
git add src/payload/payload-types.ts
git commit -m "chore(chat): regenerate payload types for Live chat fields"
```

Note: `payload-types.ts` already shows as modified by the unrelated analytics WIP. Before committing, run `git diff --staged src/payload/payload-types.ts` and confirm the staged hunks are only the chat-related additions. If the regeneration pulled in unrelated WIP-driven changes, that's expected since it regenerates the whole file — in that case proceed (the file is generated, not hand-edited).

---

## Task 5: Build the `<LiveChatWidget>` component

**Files:**
- Create: `components/chat/live-chat-widget.tsx`

No unit test: this component is third-party `next/script` glue (per spec — testing it would only assert on vendor markup). It is verified by build + visual check in Task 8.

- [ ] **Step 1: Create the component**

Create `components/chat/live-chat-widget.tsx`:

```tsx
'use client';

import Script from 'next/script';
import { useEffect, type ReactElement } from 'react';
import type { ChatConfig } from '@/lib/store-settings';

const FB_SDK_SRC = 'https://connect.facebook.net/vi_VN/sdk/xfbml.customerchat.js';
const ZALO_SDK_SRC = 'https://sp.zalo.me/plugins/sdk.js';

export default function LiveChatWidget({ config }: { config: ChatConfig }): ReactElement | null {
  const { messenger } = config;

  // The Facebook SDK calls window.fbAsyncInit on load; define it before the
  // (lazyOnload) SDK script fires. useEffect runs on mount, well before that.
  useEffect(() => {
    if (!messenger) return;
    (window as unknown as { fbAsyncInit?: () => void }).fbAsyncInit = () => {
      const FB = (window as unknown as { FB?: { init: (o: Record<string, unknown>) => void } }).FB;
      FB?.init({ xfbml: true, version: 'v21.0' });
    };
  }, [messenger]);

  if (!config.enabled || (!config.zalo && !config.messenger)) {
    return null;
  }

  return (
    <>
      {config.messenger ? (
        <>
          <div id="fb-root" />
          <div
            className="fb-customerchat"
            // Facebook reads these as DOM attributes; React passes string props through.
            page_id={config.messenger.pageId}
            attribution="biz_inbox"
            greeting_dialog_display="hide"
            {...(config.messenger.themeColor ? { theme_color: config.messenger.themeColor } : {})}
            {...(config.messenger.greeting
              ? {
                  logged_in_greeting: config.messenger.greeting,
                  logged_out_greeting: config.messenger.greeting,
                }
              : {})}
          />
          <Script id="fb-customerchat-sdk" src={FB_SDK_SRC} strategy="lazyOnload" />
        </>
      ) : null}

      {config.zalo ? (
        <>
          <div
            className="zalo-chat-widget"
            data-oaid={config.zalo.oaId}
            data-welcome-message={config.zalo.welcomeMessage || undefined}
            data-autopopup="0"
            data-width=""
            data-height=""
          />
          <Script id="zalo-chat-sdk" src={ZALO_SDK_SRC} strategy="lazyOnload" />
        </>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Handle the JSX custom-attribute types**

`page_id`, `attribution`, `theme_color`, etc. are not standard DOM props, so strict TSX will error. Add a module-level type augmentation at the top of the same file (below the imports) so these attributes are allowed on the `fb-customerchat` div:

```tsx
declare module 'react' {
  interface HTMLAttributes<T> {
    page_id?: string;
    attribution?: string;
    greeting_dialog_display?: string;
    theme_color?: string;
    logged_in_greeting?: string;
    logged_out_greeting?: string;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new errors referencing `live-chat-widget.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/chat/live-chat-widget.tsx
git commit -m "feat(chat): add LiveChatWidget embedding Zalo and Messenger SDKs"
```

---

## Task 6: Add bubble-stacking CSS

**Files:**
- Modify: `app/globals.css`

The two SDKs each render a fixed bottom-right bubble. Zalo keeps the corner; Messenger is lifted above it. Values are approximate and confirmed visually in Task 8.

- [ ] **Step 1: Append the stacking rules**

Add to the end of `app/globals.css`:

```css
/* Live chat: stack Messenger above the Zalo bubble so they don't overlap. */
.fb_dialog {
  bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
}
.fb_dialog.fb_dialog_advanced,
.fb-customerchat > span > iframe {
  bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
}
.zalo-chat-widget {
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style(chat): stack Messenger above Zalo chat bubble"
```

---

## Task 7: Wire the widget into the storefront layout

**Files:**
- Modify: `app/(storefront)/layout.tsx`

- [ ] **Step 1: Import the component and config helper**

Add near the other component imports:

```tsx
import LiveChatWidget from '@/components/chat/live-chat-widget';
```

Add to the store-settings import (it currently imports `getStoreBranding` from `@/lib/store-branding`; `getChatConfig` lives in `@/lib/store-settings`):

```tsx
import { getChatConfig } from '@/lib/store-settings';
```

- [ ] **Step 2: Fetch the config in the layout body**

In `StorefrontLayout`, alongside `const branding = await getStoreBranding();`, add:

```tsx
  const chatConfig = await getChatConfig();
```

(Both call the cached `getStoreSettings()` under the hood, so this is not a second DB hit.)

- [ ] **Step 3: Render the widget**

After `<PwaInstallPrompt />` and before the `<Suspense>` analytics block, add:

```tsx
          <LiveChatWidget config={chatConfig} />
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new errors referencing `layout.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "app/(storefront)/layout.tsx"
git commit -m "feat(chat): render LiveChatWidget in storefront layout"
```

---

## Task 8: Manual verification + DECISIONS.md entry

**Files:**
- Modify/create: `DECISIONS.md`

- [ ] **Step 1: Full test + lint**

Run: `pnpm test && pnpm lint`
Expected: store-settings tests pass; no new lint errors in chat files.

- [ ] **Step 2: Manual smoke test**

Start the dev server (`pnpm dev`), then in `/admin` → Store settings → Live chat:
- Enable the widget, enable Zalo with a real OA ID → confirm the Zalo bubble appears bottom-right on the storefront.
- Enable Messenger with a real Page ID (and whitelist `localhost` in the FB Page Chat Plugin settings) → confirm the Messenger bubble appears stacked above the Zalo bubble, no overlap.
- Toggle the master switch off → confirm both bubbles disappear.

Expected: bubbles render/stack correctly; disabling removes them. If overlap occurs, adjust the `84px` offset in `app/globals.css`.

- [ ] **Step 3: Add the decision-log entry**

Append to `DECISIONS.md` (create it with a `# Decisions` heading if it does not yet exist):

```markdown
## 2026-06-03 — Live chat via embedded Zalo/Messenger SDKs
**Chosen:** Embed the official Zalo OA chat SDK and Facebook Messenger Chat Plugin as stacked floating bubbles, configured in the StoreSettings admin global, loaded on every storefront page.
**Alternatives:** (a) Lightweight link-out contact bubble (zalo.me / m.me / tel) with no third-party scripts; (b) consent-gated loading via hasAnalyticsConsent(); (c) env-var config instead of admin.
**Why:** User wanted real in-page chat (embedded SDKs). Admin config fits the white-label storefront and needs no redeploy. Always-load keeps chat reachable for a VN-focused shop where chat is treated as functional.
**Trade-offs:** Loads Facebook/Zalo third-party cookies before cookie consent — weaker privacy posture than the gated Analytics, a compliance risk in stricter (EU/GDPR) markets. Messenger requires a manual one-time domain whitelist in the Facebook Page settings that cannot be automated.
**Revisit if:** Expanding to EU/GDPR markets (then gate behind consent), or if the dual heavy SDKs hurt Core Web Vitals (then switch to link-out bubbles).
```

- [ ] **Step 4: Commit**

```bash
git add DECISIONS.md
git commit -m "docs(chat): log embedded-SDK live-chat decision"
```

---

## Self-Review Notes

- **Spec coverage:** Payload tab (Task 3), resolver + getChatConfig (Tasks 1–2), component with both SDKs + lazyOnload + conditional render (Task 5), stacking CSS (Task 6), layout wiring (Task 7), types regen (Task 4), tests for resolver normalization (Task 1), FB domain-whitelist documented (Tasks 3 & 8), DECISIONS entry (Task 8). All spec sections mapped.
- **Type consistency:** `ChatConfig` shape (`enabled`, `zalo{enabled,oaId,welcomeMessage}`, `messenger{enabled,pageId,themeColor,greeting}`) is identical across the helper (Task 1), resolver/defaults (Task 2), and component props (Task 5). Helper name `resolveChatConfig` and accessor `getChatConfig` are used consistently.
- **No placeholders:** every code/command step is concrete.
- **Always-load:** no consent gating wired in, per the locked decision.
