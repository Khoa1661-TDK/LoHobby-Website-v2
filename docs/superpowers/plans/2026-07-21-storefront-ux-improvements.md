# Storefront UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five remaining items of `docs/superpowers/specs/2026-07-21-storefront-ux-improvements-design.md` — a branded recovery 404, free-shipping progress in the cart, a dedicated `/cart` page, a keyboard-operable search combobox, and route-level error/loading scaffolding.

**Architecture:** All work is additive inside the existing Next.js App Router storefront. New pure logic goes in `lib/` with node-project unit tests; new UI follows the established server-wrapper / client-component split (`components/cart/index.tsx` fetches, `components/cart/modal.tsx` renders). Copy goes through `next-intl` message files, never hardcoded. No new dependencies, no new mutation paths — the cart page reuses the existing server actions in `components/cart/actions.ts`.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS 4, next-intl, Payload CMS (via `lib/shipping-settings.ts`), Vitest (node + jsdom projects), Headless UI.

## Global Constraints

These apply to **every** task. They are not repeated per-task.

- **Run binaries directly, not through pnpm scripts.** `pnpm <script>` fails in this environment via `runDepsStatusCheck`. Use `node_modules/.bin/vitest` and `node_modules/.bin/tsc`.
- **Test files MUST explicitly import from vitest** — `import { describe, expect, it } from 'vitest';`. `globals: true` is runtime-only; without the import `tsc --noEmit` fails.
- **Test file locations are fixed by `vitest.config.ts`:** node-environment tests go in `lib/__tests__/**/*.test.ts`; React/jsdom tests go in `components/**/__tests__/**/*.test.tsx`. A `.test.tsx` outside `components/` will not be collected.
- **No hardcoded user-facing strings.** Every new string is added to **both** `messages/vi.json` and `messages/en.json` and read via `useTranslations` (client) or `getTranslations` (server).
- **Theme tokens only.** Use `font-display` and the `warm-*` scale. `font-serif` and `filament-*` are from the retired pre-Lô Hobby theme and must not appear in new code.
- **No class-name strings or regex literals in `lib/`.** Tailwind's content globs exclude `lib/`, so class strings returned from there get purged; a bracketed regex in `lib/` has previously broken the entire stylesheet. Keep both in `components/`.
- **Locale-aware navigation.** Inside storefront components import `Link` / `useRouter` from `@/i18n/navigation`, never from `next/link` or `next/navigation`. The one exception is `app/not-found.tsx` (Task 2), which sits outside locale context.
- **Locales are `vi` (default) and `en`**, `localePrefix: 'always'`.
- **Commit style:** Conventional Commits, imperative, lowercase, no trailing period. Commit directly to `main` (solo project — no branches or PRs).
- **Before every commit:** `node_modules/.bin/tsc --noEmit` and `node_modules/.bin/vitest run` must both pass.

## Out of scope for this plan

- **§1 `APP_URL`** — user-owned Portainer config, not code. Still not live in production as of 2026-07-21.
- **§6a unaccented Vietnamese search** — already shipped in `ecc5699` and `9c85116`.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `lib/free-shipping.ts` | Pure threshold math. No React, no Tailwind, no regex. |
| `lib/__tests__/free-shipping.test.ts` | Unit tests for the above. |
| `components/cart/free-shipping-progress.tsx` | Renders the bar/message. Returns `null` when disabled. |
| `components/cart/line-item.tsx` | One cart line — image, title, price, qty controls, remove. Shared by modal and page. |
| `components/cart/cart-page-client.tsx` | Client shell for the `/cart` page (qty/remove transitions). |
| `app/[locale]/(storefront)/cart/page.tsx` | Server component: fetches cart + shipping settings, renders the page. |
| `app/[locale]/(storefront)/[...rest]/page.tsx` | Catch-all that calls `notFound()` so unmatched locale paths render in-layout. |
| `app/not-found.tsx` | Root 404 for paths with no locale segment. Renders its own `<html>`/`<body>`. |
| `app/global-error.tsx` | Root error boundary. Client component, own `<html>`/`<body>`. |
| `app/[locale]/(storefront)/blog/loading.tsx` | Blog index skeleton. |
| `app/[locale]/(storefront)/profile/loading.tsx` | Profile skeleton. |
| `components/cart/__tests__/free-shipping-progress.test.tsx` | jsdom render tests. |
| `components/layout/navbar/__tests__/search-combobox.test.tsx` | Keyboard/ARIA tests. |

**Modified:**

| Path | Change |
|---|---|
| `app/[locale]/(storefront)/not-found.tsx` | Retheme onto `font-display`/`warm-*`, localize, add recovery links. |
| `components/cart/index.tsx` | Also fetch `getShippingSettings()`, pass threshold down. |
| `components/cart/modal.tsx` | Accept threshold prop, render progress, use shared line item, link to `/cart`. |
| `components/layout/navbar/search.tsx` | Promote to ARIA combobox with keyboard handling; localize copy. |
| `messages/vi.json`, `messages/en.json` | New `notFound` namespace; new keys under `cart` and `search`. |

**Critical structural fact (verified):** `app/layout.tsx` is a **pass-through** that returns `children` — it renders no `<html>`/`<body>`. Only `app/[locale]/(storefront)/layout.tsx:216` and `app/(payload)/layout.tsx` own those tags. Therefore **both** `app/not-found.tsx` and `app/global-error.tsx` must render their own `<html>` and `<body>`, or they produce invalid markup. This is unusual — do not assume the Next.js default arrangement.

---

## Task 1: Branded, localized, route-catching storefront 404

Spec §2. Delivers: unmatched `/[locale]/*` paths render the storefront 404 **inside** the storefront layout, with navbar, search, and footer intact.

**Files:**
- Modify: `messages/vi.json`, `messages/en.json` (add top-level `notFound` namespace)
- Modify: `app/[locale]/(storefront)/not-found.tsx` (full rewrite, 26 lines)
- Create: `app/[locale]/(storefront)/[...rest]/page.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the `notFound` message namespace with keys `metaTitle`, `heading`, `body`, `homeCta`, `browseCta`, `helpBody`. Task 2 reuses the *copy* but not the namespace (it has no locale context).

**Design note on scope:** the spec asks for "a search entry point and links to top categories". Once the catch-all lands, this page renders **inside** the storefront layout, which already provides the navbar search input and the full category navigation. Adding a second category fetch here would duplicate that chrome for no gain, so this task provides the heading, body, a home CTA, and a browse-all-products CTA (`/search`), and relies on the in-layout navbar for search and categories. This is a deliberate narrowing — record it in the commit body.

- [ ] **Step 1: Add the `notFound` namespace to `messages/vi.json`**

Add as a new **top-level** key (sibling of `cart`, `search`, etc. — the file's top-level keys are `common`, `nav`, `footer`, `cart`, `product`, `checkout`, `auth`, `profile`, `search`, `home`, `blog`, `info`, `youtube`):

```json
"notFound": {
  "metaTitle": "Không tìm thấy trang",
  "heading": "Không tìm thấy trang",
  "body": "Trang hoặc sản phẩm bạn tìm không tồn tại hoặc đã được gỡ xuống.",
  "helpBody": "Thử tìm kiếm ở thanh trên, hoặc quay lại khám phá cửa hàng.",
  "homeCta": "Về trang chủ",
  "browseCta": "Xem tất cả sản phẩm"
}
```

- [ ] **Step 2: Add the mirrored `notFound` namespace to `messages/en.json`**

Same position, same keys:

```json
"notFound": {
  "metaTitle": "Page not found",
  "heading": "Page not found",
  "body": "The page or product you're looking for doesn't exist or has been taken down.",
  "helpBody": "Try the search bar above, or head back and browse the store.",
  "homeCta": "Back to home",
  "browseCta": "Browse all products"
}
```

- [ ] **Step 3: Verify both message files are still valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Rewrite `app/[locale]/(storefront)/not-found.tsx`**

Replace the entire file. Note it becomes `async` (it now awaits `getTranslations`), and the stale `font-serif` / `filament-500` classes are gone. The CTA styling is copied from the empty-cart block in `app/[locale]/(storefront)/checkout/page.tsx` so the two match.

```tsx
// app/[locale]/(storefront)/not-found.tsx — renders inside the storefront
// layout, so the navbar (with search) and footer are already present.
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: true },
  };
}

export default async function NotFound(): Promise<ReactElement> {
  const t = await getTranslations('notFound');

  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center md:py-24">
      <p className="font-display text-6xl font-bold tracking-tight text-warm-300 dark:text-warm-700">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
        {t('heading')}
      </h1>
      <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">{t('body')}</p>
      <p className="mt-1.5 text-sm text-warm-500 dark:text-warm-500">{t('helpBody')}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('homeCta')}
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-xl border border-warm-200/80 px-5 py-2.5 text-sm font-semibold text-warm-800 transition-all duration-200 hover:bg-warm-100/60 active:scale-[0.98] dark:border-warm-800/60 dark:text-warm-200 dark:hover:bg-warm-800/50"
        >
          {t('browseCta')}
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create the catch-all segment**

Create `app/[locale]/(storefront)/[...rest]/page.tsx`:

```tsx
// app/[locale]/(storefront)/[...rest]/page.tsx
// Unmatched paths under a locale prefix do not otherwise resolve into the
// storefront route group, so they fall through to Next's built-in bare 404.
// This lowest-priority catch-all pulls them into the group and triggers the
// branded not-found.tsx above, inside the storefront layout.
import { notFound } from 'next/navigation';

export default function StorefrontCatchAll(): never {
  notFound();
}
```

- [ ] **Step 6: Verify types compile**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 7: Start the dev server and verify the catch-all does not shadow real routes**

This is the primary risk of this task. Next.js ranks catch-all segments lowest, so static and dynamic routes should still win — but the spec requires this be **verified, not assumed**.

Start the server in one shell:
```bash
node_modules/.bin/next dev
```

In another, probe every pre-existing storefront route and the 404 path:
```bash
for p in / /vi /en /vi/search /vi/blog /vi/login /vi/about /vi/contact /vi/faq /vi/checkout /vi/profile; do
  printf '%s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$p")"
done
curl -s -o /dev/null -w 'catchall -> %{http_code}\n' http://localhost:3000/vi/definitely-not-a-real-page
curl -s -o /dev/null -w 'api -> %{http_code}\n' http://localhost:3000/api/auth/providers
```

Expected: every real route returns its previous status (200, or 307/302 for the auth-gated `/vi/checkout` and `/vi/profile`); `catchall` returns **404**; `api` returns 200. If any real route now returns 404, the catch-all is shadowing it — stop and investigate before continuing.

- [ ] **Step 8: Verify the 404 renders in-layout and localized**

```bash
curl -s http://localhost:3000/vi/definitely-not-a-real-page | grep -c '<nav\|<footer'
curl -s http://localhost:3000/vi/definitely-not-a-real-page | grep -c 'Không tìm thấy trang'
curl -s http://localhost:3000/en/definitely-not-a-real-page | grep -c 'Page not found'
curl -s http://localhost:3000/vi/definitely-not-a-real-page | grep -c 'filament-\|font-serif'
```

Expected: first three are **non-zero**; the last is **0**.

- [ ] **Step 9: Commit**

```bash
git add messages/vi.json messages/en.json "app/[locale]/(storefront)/not-found.tsx" "app/[locale]/(storefront)/[...rest]/page.tsx"
git commit -m "fix(404): render a branded localized not-found for unmatched routes

Unmatched /[locale]/* paths never reached the storefront not-found page, so
they served Next's bare English error with no navbar, footer, or way back
into the store. A lowest-priority catch-all pulls them into the storefront
group; the page itself moves off the retired font-serif/filament theme onto
font-display/warm-* and reads its copy from next-intl.

Search and category recovery links are intentionally left to the in-layout
navbar rather than duplicated on the page."
```

---

## Task 2: Root 404 for paths with no locale segment

Spec §2 part 3. Delivers: a self-contained branded page for requests that never resolve to a locale.

**Files:**
- Create: `app/not-found.tsx`

**Interfaces:**
- Consumes: nothing. It sits outside `NextIntlClientProvider`, so `useTranslations`/`getTranslations` are **unavailable** — copy is hardcoded Vietnamese (the default locale), which is the deliberate trade-off recorded in the spec.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `app/not-found.tsx`**

The `<html>`/`<body>` tags are **required** here, not optional: `app/layout.tsx` is a pass-through that renders no document shell. Importing `./globals.css` is what gives this page Tailwind.

```tsx
// app/not-found.tsx — for requests that never resolve to a locale segment.
//
// This renders under the pass-through root layout (app/layout.tsx returns its
// children verbatim), so unlike a normal Next.js page it must supply its own
// <html> and <body>. It also sits outside NextIntlClientProvider, so it cannot
// use next-intl; copy is the default locale (vi) as a fallback.
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: true },
};

export default function RootNotFound(): ReactElement {
  return (
    <html lang="vi">
      <body className="bg-warm-50 text-warm-900 dark:bg-warm-950 dark:text-warm-100">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
          <p className="font-display text-6xl font-bold tracking-tight text-warm-300 dark:text-warm-700">
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-semibold">Không tìm thấy trang</h1>
          <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
            Trang bạn tìm không tồn tại hoặc đã được gỡ xuống.
          </p>
          <Link
            href="/vi"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 transition-all duration-200 hover:bg-warm-800 active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
          >
            Về trang chủ
          </Link>
        </main>
      </body>
    </html>
  );
}
```

Note `href="/vi"` uses `next/link` with an explicit locale prefix — the i18n `Link` helper cannot be used without locale context.

- [ ] **Step 2: Verify types compile**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Verify the page renders a complete document**

With the dev server running:
```bash
curl -s http://localhost:3000/vi/definitely-not-a-real-page | grep -c '<nav'
```
Expected: **non-zero** — confirms Task 1's in-layout 404 still wins for locale paths and this root page did not take over.

Then confirm the root page itself produces a valid document (single `<html>`, single `<body>`):
```bash
curl -s http://localhost:3000/_not-a-locale/nope | grep -o '<html\|<body' | sort | uniq -c
```
Expected: exactly one `<html` and one `<body`. If you see zero, the page is not being reached; if you see two, a layout is also emitting them.

- [ ] **Step 4: Commit**

```bash
git add app/not-found.tsx
git commit -m "fix(404): add a branded root not-found for non-locale paths

app/layout.tsx is a pass-through that renders no document shell, so this page
supplies its own <html>/<body>. It sits outside NextIntlClientProvider and
therefore hardcodes the default-locale (vi) copy."
```

---

## Task 3: Free-shipping threshold logic

Spec §3, logic half. Delivers: a tested pure function. No UI yet.

**Files:**
- Create: `lib/free-shipping.ts`
- Create: `lib/__tests__/free-shipping.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type FreeShippingProgress = {
    qualified: boolean;
    remainingVnd: number;
    percent: number; // 0–100, integer
  };
  export function resolveFreeShippingProgress(
    subtotalVnd: number,
    thresholdVnd: number,
  ): FreeShippingProgress | null;
  ```
  Task 4 imports both. **`null` means the feature is disabled and nothing should render.**

**The critical rule:** `lib/shipping-settings.ts:99` defaults `freeShippingThresholdVnd` to `0`. Zero means **disabled**, not "everything ships free". Getting this backwards would tell every shopper their order already qualifies.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/free-shipping.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveFreeShippingProgress } from '@/lib/free-shipping';

describe('resolveFreeShippingProgress', () => {
  it('should return null when the threshold is zero (feature disabled)', () => {
    expect(resolveFreeShippingProgress(500_000, 0)).toBeNull();
  });

  it('should return null when the threshold is negative', () => {
    expect(resolveFreeShippingProgress(500_000, -1)).toBeNull();
  });

  it('should return null when the threshold is not a finite number', () => {
    expect(resolveFreeShippingProgress(500_000, Number.NaN)).toBeNull();
  });

  it('should report the remaining amount when the subtotal is below the threshold', () => {
    expect(resolveFreeShippingProgress(300_000, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 200_000,
      percent: 60,
    });
  });

  it('should qualify when the subtotal exactly equals the threshold', () => {
    expect(resolveFreeShippingProgress(500_000, 500_000)).toEqual({
      qualified: true,
      remainingVnd: 0,
      percent: 100,
    });
  });

  it('should qualify and clamp the percent when the subtotal exceeds the threshold', () => {
    expect(resolveFreeShippingProgress(900_000, 500_000)).toEqual({
      qualified: true,
      remainingVnd: 0,
      percent: 100,
    });
  });

  it('should treat an empty cart as zero progress rather than qualifying', () => {
    expect(resolveFreeShippingProgress(0, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 500_000,
      percent: 0,
    });
  });

  it('should treat a non-finite subtotal as zero', () => {
    expect(resolveFreeShippingProgress(Number.NaN, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 500_000,
      percent: 0,
    });
  });

  it('should round the percent to an integer', () => {
    // Optional chaining is required: the return type is nullable, and tsc
    // --noEmit is part of the commit gate.
    expect(resolveFreeShippingProgress(1, 3)?.percent).toBe(33);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/free-shipping.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/free-shipping"`.

- [ ] **Step 3: Write the implementation**

Create `lib/free-shipping.ts`:

```ts
// lib/free-shipping.ts — free-shipping threshold math for the cart.
//
// A threshold of 0 means the feature is DISABLED (that is the default in
// lib/shipping-settings.ts), not that everything ships free. Callers get null
// in that case and must render nothing.

export type FreeShippingProgress = {
  qualified: boolean;
  /** Amount still needed to qualify, in VND. Always 0 once qualified. */
  remainingVnd: number;
  /** Progress toward the threshold, 0–100, rounded to an integer. */
  percent: number;
};

export function resolveFreeShippingProgress(
  subtotalVnd: number,
  thresholdVnd: number,
): FreeShippingProgress | null {
  if (!Number.isFinite(thresholdVnd) || thresholdVnd <= 0) return null;

  const subtotal = Number.isFinite(subtotalVnd) && subtotalVnd > 0 ? subtotalVnd : 0;

  if (subtotal >= thresholdVnd) {
    return { qualified: true, remainingVnd: 0, percent: 100 };
  }

  return {
    qualified: false,
    remainingVnd: thresholdVnd - subtotal,
    percent: Math.round((subtotal / thresholdVnd) * 100),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/free-shipping.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Verify types compile**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add lib/free-shipping.ts lib/__tests__/free-shipping.test.ts
git commit -m "feat(cart): add free-shipping threshold progress helper

A threshold of 0 is the shipping-settings default and means the feature is
off, so the helper returns null rather than reporting every cart as already
qualifying."
```

---

## Task 4: Free-shipping progress in the cart modal

Spec §3, UI half. Delivers: shoppers see how far they are from free shipping *before* checkout.

**Files:**
- Create: `components/cart/free-shipping-progress.tsx`
- Create: `components/cart/__tests__/free-shipping-progress.test.tsx`
- Modify: `components/cart/index.tsx`
- Modify: `components/cart/modal.tsx`
- Modify: `messages/vi.json`, `messages/en.json`

**Interfaces:**
- Consumes: `resolveFreeShippingProgress`, `FreeShippingProgress` from Task 3.
- Produces:
  ```tsx
  type FreeShippingProgressProps = {
    subtotalVnd: number;
    currencyCode: string;
    thresholdVnd: number;
  };
  export default function FreeShippingProgress(props: FreeShippingProgressProps): ReactElement | null;
  ```
  and `CartModal` gains a required `freeShippingThresholdVnd: number` prop. Task 6 renders the same component on the `/cart` page.

- [ ] **Step 1: Add the message keys to `messages/vi.json`**

Add inside the existing `cart` object, after `"shippingAtCheckout"`:

```json
"freeShippingRemaining": "Mua thêm {amount} để được miễn phí vận chuyển",
"freeShippingQualified": "Bạn được miễn phí vận chuyển!",
"freeShippingProgressAria": "Tiến độ miễn phí vận chuyển"
```

- [ ] **Step 2: Add the mirrored keys to `messages/en.json`**

Inside the same `cart` object:

```json
"freeShippingRemaining": "Add {amount} more for free shipping",
"freeShippingQualified": "You've earned free shipping!",
"freeShippingProgressAria": "Free shipping progress"
```

- [ ] **Step 3: Verify both files are valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Write the failing component test**

Create `components/cart/__tests__/free-shipping-progress.test.tsx`. `NextIntlClientProvider` is wrapped around the component so `useTranslations` resolves against real message objects rather than a mock.

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import FreeShippingProgress from '@/components/cart/free-shipping-progress';

const messages = {
  cart: {
    freeShippingRemaining: 'Add {amount} more for free shipping',
    freeShippingQualified: "You've earned free shipping!",
    freeShippingProgressAria: 'Free shipping progress',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('FreeShippingProgress', () => {
  it('should render nothing when the threshold is zero', () => {
    const { container } = renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should show the remaining amount when below the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText(/more for free shipping/)).toBeInTheDocument();
  });

  it('should expose the progress bar with the correct aria values when below', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={500000} />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should show the qualified message at the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={500000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText("You've earned free shipping!")).toBeInTheDocument();
  });

  it('should show the qualified message above the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={900000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText("You've earned free shipping!")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run components/cart/__tests__/free-shipping-progress.test.tsx`
Expected: FAIL — cannot resolve `@/components/cart/free-shipping-progress`.

- [ ] **Step 6: Write the component**

Create `components/cart/free-shipping-progress.tsx`:

```tsx
// components/cart/free-shipping-progress.tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import { resolveFreeShippingProgress } from '@/lib/free-shipping';

type Props = {
  subtotalVnd: number;
  currencyCode: string;
  thresholdVnd: number;
};

export default function FreeShippingProgress({
  subtotalVnd,
  currencyCode,
  thresholdVnd,
}: Props): ReactElement | null {
  const t = useTranslations('cart');
  const progress = resolveFreeShippingProgress(subtotalVnd, thresholdVnd);

  // null = no threshold configured, so the feature is off entirely.
  if (!progress) return null;

  return (
    <div className="rounded-xl border border-warm-200/60 bg-warm-100/40 px-3 py-2.5 dark:border-warm-800/40 dark:bg-warm-900/40">
      {progress.qualified ? (
        <p className="text-xs font-semibold text-warm-900 dark:text-warm-100">
          {t('freeShippingQualified')}
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-1 text-xs text-warm-600 dark:text-warm-400">
          {t.rich('freeShippingRemaining', {
            amount: () => (
              <Price
                amount={progress.remainingVnd}
                currencyCode={currencyCode}
                className="inline font-semibold text-warm-900 dark:text-warm-100"
              />
            ),
          })}
        </p>
      )}
      <div
        role="progressbar"
        aria-label={t('freeShippingProgressAria')}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-warm-200/80 dark:bg-warm-800/60"
      >
        <div
          className="h-full rounded-full bg-warm-900 transition-all duration-300 dark:bg-warm-100"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
```

`t.rich` is used rather than `t` because the amount is a `<Price>` element, not a string. `Price` renders a `<p>`; the `inline` class keeps it on the same line inside the flex-wrap paragraph.

- [ ] **Step 7: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run components/cart/__tests__/free-shipping-progress.test.tsx`
Expected: PASS, 5 tests.

If the "more for free shipping" text assertion fails because `t.rich` splits the string across elements, change that assertion to match on the container instead:
```tsx
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText("You've earned free shipping!")).toBeNull();
```

- [ ] **Step 8: Fetch the shipping settings in the cart server wrapper**

Replace `components/cart/index.tsx` entirely:

```tsx
// components/cart/index.tsx — server wrapper that fetches the cookie cart
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import CartModal from '@/components/cart/modal';
import { getCart } from '@/lib/cart';
import { getShippingSettings } from '@/lib/shipping-settings';

export default async function Cart(): Promise<ReactElement> {
  const session = await auth();
  const [cart, shipping] = await Promise.all([
    getCart(session?.user?.id ?? null),
    getShippingSettings(),
  ]);
  return (
    <CartModal cart={cart} freeShippingThresholdVnd={shipping.freeShippingThresholdVnd} />
  );
}
```

- [ ] **Step 9: Accept and render the threshold in the modal**

In `components/cart/modal.tsx`:

a) Add the import next to the other component imports:
```tsx
import FreeShippingProgress from '@/components/cart/free-shipping-progress';
```

b) Change the props type and signature (currently lines 28–30):
```tsx
type Props = { cart: Cart; freeShippingThresholdVnd: number };

export default function CartModal({ cart, freeShippingThresholdVnd }: Props): ReactElement {
```

c) Render the progress immediately **above** the totals block. Find the totals `<div>` that opens with `className="py-4 text-sm text-warm-500 dark:text-warm-400"` and insert before it:

```tsx
                  <div className="pt-3">
                    <FreeShippingProgress
                      subtotalVnd={Number(cart.cost.subtotalAmount.amount)}
                      currencyCode={cart.cost.subtotalAmount.currencyCode}
                      thresholdVnd={freeShippingThresholdVnd}
                    />
                  </div>
```

`cart.cost.subtotalAmount.amount` is a string (`Money`), hence the `Number()` conversion. The helper already treats a `NaN` subtotal as zero.

- [ ] **Step 10: Run the full test suite and type check**

Run:
```bash
node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit
```
Expected: all tests pass, tsc exits 0.

- [ ] **Step 11: Verify in the browser**

With the dev server running, add an item to the cart and open the modal. With the default `freeShippingThresholdVnd` of `0`, **no free-shipping UI should appear at all** — that is the correct behaviour, not a bug.

To see the feature, set a threshold in the Payload admin at `/admin` → Globals → Shipping Settings → `freeShippingThresholdVnd`, then restart the dev server (cross-process writes do not bust `unstable_cache`).

- [ ] **Step 12: Commit**

```bash
git add components/cart/free-shipping-progress.tsx components/cart/__tests__/free-shipping-progress.test.tsx components/cart/index.tsx components/cart/modal.tsx messages/vi.json messages/en.json
git commit -m "feat(cart): show free-shipping progress in the cart modal

The threshold was only surfaced at checkout, past the point where a shopper
could add an item to qualify. Renders nothing when no threshold is
configured, since 0 is the shipping-settings default and means disabled."
```

---

## Task 5: Extract the shared cart line item

Spec §4, refactor half. **No behaviour change.** Kept as its own commit per `existing-code.md` §3 — refactoring and features do not share a commit.

**Files:**
- Create: `components/cart/line-item.tsx`
- Modify: `components/cart/modal.tsx`

**Interfaces:**
- Consumes: `CartLine` from `@/lib/cart`.
- Produces:
  ```tsx
  type CartLineItemProps = {
    item: CartLine;
    disabled: boolean;
    onRemove: () => void;
    onQuantityChange: (quantity: number) => void;
    onNavigate?: () => void;
  };
  export default function CartLineItem(props: CartLineItemProps): ReactElement;
  ```
  Task 6 renders this on the `/cart` page. `onNavigate` is optional because only the modal needs to close itself when a product link is followed.

- [ ] **Step 1: Create the shared line-item component**

Create `components/cart/line-item.tsx`. The markup and every class name below are lifted verbatim from `modal.tsx` lines 122–224 — the only changes are the callback props replacing inline `startTransition` bodies, and `onNavigate` replacing `closeCart`. The `QtyButton` / `QtyInput` / `CloseIcon` helpers move here from `modal.tsx`.

```tsx
// components/cart/line-item.tsx — one cart line, shared by the cart modal and
// the /cart page so the two cannot drift.
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import Price from '@/components/price';
import { useBumpPulse } from '@/lib/animations/hooks/useBumpPulse';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { CartLine } from '@/lib/cart';

type Props = {
  item: CartLine;
  disabled: boolean;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
  onNavigate?: () => void;
};

export default function CartLineItem({
  item,
  disabled,
  onRemove,
  onQuantityChange,
  onNavigate,
}: Props): ReactElement {
  const t = useTranslations('cart');

  return (
    <li className="flex w-full flex-col border-b border-warm-200/50 last:border-b-0 dark:border-warm-800/30">
      <div className="relative flex w-full flex-row justify-between px-1 py-4">
        <div className="absolute z-40 -ml-1 -mt-2">
          <button
            aria-label={t('removeItemAria')}
            disabled={disabled}
            onClick={onRemove}
            className="ease relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-warm-300 transition-all duration-200 before:absolute before:-inset-3.5 before:content-[''] hover:bg-warm-900 hover:scale-110 disabled:opacity-50 dark:bg-warm-700 dark:hover:bg-warm-100 dark:hover:text-warm-900"
          >
            <CloseIcon className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <div className="flex flex-row">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-warm-200/60 bg-warm-100/50 dark:border-warm-800/40 dark:bg-warm-900/50">
            <Image
              className="img-fit p-1"
              width={64}
              height={64}
              alt={item.product.featuredImage.altText || item.product.title}
              src={toNextImageSrc(item.product.featuredImage.url)}
            />
          </div>
          <Link
            href={`/product/${item.handle}`}
            onClick={onNavigate}
            className="z-30 ml-3 flex flex-row"
          >
            <div className="flex flex-1 flex-col text-sm">
              <span className="line-clamp-2 font-medium leading-snug">{item.product.title}</span>
              {item.variantName ? (
                <span className="mt-0.5 text-xs text-warm-500 dark:text-warm-400">
                  {item.variantName}
                </span>
              ) : null}
            </div>
          </Link>
        </div>
        <div className="flex h-16 flex-col items-end justify-between">
          <Price
            className="text-sm font-semibold"
            amount={item.lineTotal.amount}
            currencyCode={item.lineTotal.currencyCode}
          />
          <div className="flex items-center rounded-lg border border-warm-200/60 dark:border-warm-800/40">
            <QtyButton
              type="minus"
              disabled={disabled}
              onClick={() => onQuantityChange(item.quantity - 1)}
            />
            <QtyInput
              quantity={item.quantity}
              disabled={disabled}
              onCommit={onQuantityChange}
            />
            <QtyButton
              type="plus"
              disabled={disabled}
              onClick={() => onQuantityChange(item.quantity + 1)}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function CloseIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function QtyInput({
  quantity,
  disabled,
  onCommit,
}: {
  quantity: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}): ReactElement {
  const t = useTranslations('cart');
  const [value, setValue] = useState(String(quantity));
  const inputRef = useBumpPulse<HTMLInputElement>(quantity);

  // Re-sync the field with the canonical quantity after a server refresh
  // (e.g. the value was clamped, or +/- buttons changed it).
  useEffect(() => {
    setValue(String(quantity));
  }, [quantity]);

  const commit = (): void => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed === quantity) {
      setValue(String(quantity));
      return;
    }
    onCommit(parsed);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={t('quantityAria')}
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="w-8 bg-transparent text-center text-sm tabular-nums text-warm-900 outline-none focus:ring-0 disabled:opacity-50 dark:text-warm-100"
    />
  );
}

function QtyButton({
  type,
  disabled,
  onClick,
}: {
  type: 'plus' | 'minus';
  disabled: boolean;
  onClick: () => void;
}): ReactElement {
  const t = useTranslations('cart');
  return (
    <button
      type="button"
      aria-label={type === 'plus' ? t('increaseQtyAria') : t('decreaseQtyAria')}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 disabled:opacity-40 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      {type === 'plus' ? <PlusIcon /> : <MinusIcon />}
    </button>
  );
}

function PlusIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function MinusIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}
```

- [ ] **Step 2: Use the shared component in the modal**

In `components/cart/modal.tsx`:

a) Add the import:
```tsx
import CartLineItem from '@/components/cart/line-item';
```

b) Replace the whole `<li>…</li>` block inside `.map((item, idx) => (…))` with a `CartLineItem`. The `.map` callback no longer needs `idx`:

```tsx
                    {cart.lines
                      .sort((a, b) => a.product.title.localeCompare(b.product.title))
                      .map((item) => (
                        <CartLineItem
                          key={item.id}
                          item={item}
                          disabled={isPending}
                          onNavigate={closeCart}
                          onRemove={() =>
                            startTransition(async () => {
                              await removeItemAction(item.merchandiseId, item.variantSku);
                              refresh();
                            })
                          }
                          onQuantityChange={(quantity) =>
                            startTransition(async () => {
                              await updateItemAction(
                                item.merchandiseId,
                                quantity,
                                item.variantSku,
                              );
                              refresh();
                            })
                          }
                        />
                      ))}
```

c) Delete the now-unused local helpers from the bottom of `modal.tsx`: `CloseIcon`, `QtyInput`, `QtyButton`, `PlusIcon`, `MinusIcon`. **Keep** `OpenCart` and `CloseCart` — those are still used by the modal itself and are *not* the same as `CloseIcon`.

d) Remove imports that are now unused in `modal.tsx`: `Image`, `useBumpPulse` is still used by `OpenCart` so **keep** it, `toNextImageSrc`. Let `tsc` tell you — see the next step.

- [ ] **Step 3: Verify types compile and no unused imports remain**

Run: `node_modules/.bin/tsc --noEmit`
Expected: exits 0. If it reports unused imports in `modal.tsx`, remove exactly those.

- [ ] **Step 4: Run the full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all pass.

- [ ] **Step 5: Verify the modal is unchanged in the browser**

Open the cart modal with items in it. Confirm: the image, title, variant name, line price, +/- buttons, typed quantity, and the remove button all still work, and clicking a product title still closes the modal and navigates. This refactor must produce **zero** visible difference.

- [ ] **Step 6: Commit**

```bash
git add components/cart/line-item.tsx components/cart/modal.tsx
git commit -m "refactor(cart): extract the shared cart line item component

No behaviour change. Pulls the line markup and its qty controls out of the
modal so the upcoming /cart page renders the identical line and the two
cannot drift."
```

---

## Task 6: Dedicated `/cart` page

Spec §4. Delivers: a bookmarkable, back-button-friendly, full-width cart.

**Files:**
- Create: `components/cart/cart-page-client.tsx`
- Create: `app/[locale]/(storefront)/cart/page.tsx`
- Modify: `components/cart/modal.tsx` (add a "view full cart" link)
- Modify: `messages/vi.json`, `messages/en.json`

**Interfaces:**
- Consumes: `CartLineItem` (Task 5), `FreeShippingProgress` (Task 4), `removeItemAction` / `updateItemAction` from `components/cart/actions.ts`, `getCart` from `@/lib/cart`, `getShippingSettings` from `@/lib/shipping-settings`.
- Produces: the route `/[locale]/cart`. Nothing later consumes it.

- [ ] **Step 1: Add the message keys to `messages/vi.json`**

Inside the existing `cart` object:

```json
"pageTitle": "Giỏ hàng của bạn",
"metaTitle": "Giỏ hàng",
"viewFullCart": "Xem giỏ hàng đầy đủ",
"subtotal": "Tạm tính",
"continueShopping": "Tiếp tục mua sắm"
```

- [ ] **Step 2: Add the mirrored keys to `messages/en.json`**

```json
"pageTitle": "Your cart",
"metaTitle": "Cart",
"viewFullCart": "View full cart",
"subtotal": "Subtotal",
"continueShopping": "Continue shopping"
```

- [ ] **Step 3: Verify both files are valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Create the client shell**

Create `components/cart/cart-page-client.tsx`. This owns the `useTransition` pending state and the `router.refresh()` after each mutation — the same pattern the modal uses.

```tsx
// components/cart/cart-page-client.tsx — interactive half of the /cart page.
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useTransition, type ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import CartCrossSell from '@/components/cart/cross-sell';
import CartLineItem from '@/components/cart/line-item';
import FreeShippingProgress from '@/components/cart/free-shipping-progress';
import Price from '@/components/price';
import { removeItemAction, updateItemAction } from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

type Props = { cart: Cart; freeShippingThresholdVnd: number };

export default function CartPageClient({
  cart,
  freeShippingThresholdVnd,
}: Props): ReactElement {
  const t = useTranslations('cart');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = (): void => {
    router.refresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <ul className="rounded-2xl border border-warm-200/60 bg-surface-raised px-4 dark:border-warm-800/40">
          {cart.lines
            .sort((a, b) => a.product.title.localeCompare(b.product.title))
            .map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                disabled={isPending}
                onRemove={() =>
                  startTransition(async () => {
                    await removeItemAction(item.merchandiseId, item.variantSku);
                    refresh();
                  })
                }
                onQuantityChange={(quantity) =>
                  startTransition(async () => {
                    await updateItemAction(item.merchandiseId, quantity, item.variantSku);
                    refresh();
                  })
                }
              />
            ))}
        </ul>

        <div className="mt-8">
          <CartCrossSell excludeHandles={cart.lines.map((line) => line.handle)} />
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-warm-200/60 bg-surface-raised p-5 lg:sticky lg:top-24 dark:border-warm-800/40">
        <FreeShippingProgress
          subtotalVnd={Number(cart.cost.subtotalAmount.amount)}
          currencyCode={cart.cost.subtotalAmount.currencyCode}
          thresholdVnd={freeShippingThresholdVnd}
        />

        <div className="mt-4 space-y-2 text-sm text-warm-500 dark:text-warm-400">
          <div className="flex items-center justify-between border-b border-warm-200/30 pb-2 dark:border-warm-800/20">
            <span>{t('subtotal')}</span>
            <Price
              className="text-sm font-medium text-warm-900 dark:text-warm-100"
              amount={cart.cost.subtotalAmount.amount}
              currencyCode={cart.cost.subtotalAmount.currencyCode}
            />
          </div>
          <div className="flex items-center justify-between border-b border-warm-200/30 pb-2 dark:border-warm-800/20">
            <span>{t('shipping')}</span>
            <span>{t('shippingAtCheckout')}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-warm-900 dark:text-warm-100">{t('total')}</span>
            <Price
              className="text-base font-bold text-warm-900 dark:text-warm-100"
              amount={cart.cost.totalAmount.amount}
              currencyCode={cart.cost.totalAmount.currencyCode}
            />
          </div>
        </div>

        <Link
          href="/checkout"
          className="mt-5 block w-full rounded-full bg-warm-900 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('checkout')}
        </Link>
        <Link
          href="/search"
          className="mt-3 block w-full text-center text-sm font-medium text-warm-600 underline-offset-4 hover:underline dark:text-warm-400"
        >
          {t('continueShopping')}
        </Link>
      </aside>
    </div>
  );
}
```

- [ ] **Step 5: Create the page**

Create `app/[locale]/(storefront)/cart/page.tsx`. It mirrors the data fetch already used by `checkout/page.tsx`, and its empty state mirrors that page's empty-cart block.

```tsx
// app/[locale]/(storefront)/cart/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import CartPageClient from '@/components/cart/cart-page-client';
import { getCart } from '@/lib/cart';
import { getShippingSettings } from '@/lib/shipping-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cart');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: true },
  };
}

export default async function CartPage(): Promise<ReactElement> {
  const t = await getTranslations('cart');
  const session = await auth();

  const [cart, shipping] = await Promise.all([
    getCart(session?.user?.id ?? null),
    getShippingSettings(),
  ]);

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
          {t('empty')}
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">{t('emptyBody')}</p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('exploreNow')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-10 md:py-14">
      <h1 className="mb-8 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
        {t('pageTitle')}
      </h1>
      <CartPageClient
        cart={cart}
        freeShippingThresholdVnd={shipping.freeShippingThresholdVnd}
      />
    </section>
  );
}
```

- [ ] **Step 6: Add the "view full cart" link to the modal**

In `components/cart/modal.tsx`, immediately **after** the checkout `<Link href="/checkout">…</Link>` block (the last child before the closing `</div>` of the non-empty branch), add:

```tsx
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="mt-3 block w-full text-center text-sm font-medium text-warm-600 underline-offset-4 hover:underline dark:text-warm-400"
                  >
                    {t('viewFullCart')}
                  </Link>
```

- [ ] **Step 7: Verify types compile and tests pass**

Run:
```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```
Expected: tsc exits 0, all tests pass.

- [ ] **Step 8: Verify the route by probe**

With the dev server running:
```bash
curl -s -o /dev/null -w '/vi/cart -> %{http_code}\n' http://localhost:3000/vi/cart
curl -s -o /dev/null -w '/en/cart -> %{http_code}\n' http://localhost:3000/en/cart
```
Expected: both **200**.

- [ ] **Step 9: Verify behaviour in the browser**

1. With an empty cart, load `/vi/cart` — the empty state renders, not a blank or broken layout.
2. Add two different products, load `/vi/cart` — both lines render with images and prices.
3. Change a quantity with `+`, then reload the page — the new quantity persisted.
4. Remove a line, then reload — it stays removed.
5. Open the cart modal and compare its **total** against the page's total for the same cart — they must be identical.
6. Click "view full cart" in the modal — it closes and navigates to `/vi/cart`.

- [ ] **Step 10: Commit**

```bash
git add "app/[locale]/(storefront)/cart/page.tsx" components/cart/cart-page-client.tsx components/cart/modal.tsx messages/vi.json messages/en.json
git commit -m "feat(cart): add a dedicated cart page

The cart existed only as a slide-over, so there was no bookmarkable URL, no
back-button affordance, and a cramped editing surface on mobile. Reuses the
existing server actions and the shared line-item component; the modal gains
a link through to it."
```

---

## Task 7: Make the search suggestion dropdown keyboard-operable

Spec §6b. Delivers: the one component that currently breaks the storefront's otherwise-strong accessibility baseline.

**Files:**
- Modify: `components/layout/navbar/search.tsx`
- Create: `components/layout/navbar/__tests__/search-combobox.test.tsx`
- Modify: `messages/vi.json`, `messages/en.json`

**Interfaces:**
- Consumes: `SearchSuggestion` from `@/app/api/search/suggest/route` (already imported).
- Produces: nothing consumed by later tasks.

**Must not change:** the 2-character minimum (line 55), the 200ms debounce (line 60), the submit-navigates-to-`/search` behaviour, or the entry animation's `prefersReducedMotion()` guard.

Note this file currently hardcodes two Vietnamese strings (the placeholder on lines 100 and 165, and the `aria-label` on line 109). Localizing them is in scope here since the task already rewrites this file's copy surface.

**Key-collision warning:** the `search` namespace **already contains** `noResults`
(`"Không tìm thấy kết quả."` / `"No results found."`) and `resultsCount`
(`"Hiển thị {count} kết quả cho"`), both used by the `/search` results page. Do **not**
redefine either — overwriting `noResults` would silently change the results-page copy too.
Reuse the existing `noResults` for the dropdown's empty row, and name the new live-region
key `suggestionCount` so it cannot be confused with `resultsCount`.

- [ ] **Step 1: Add the message keys to `messages/vi.json`**

Inside the existing `search` object. Four keys — `noResults` is **not** among them because
it already exists:

```json
"placeholder": "Tìm móc khóa, mô hình, figure…",
"submitAria": "Tìm kiếm",
"suggestionsAria": "Gợi ý sản phẩm",
"suggestionCount": "{count} gợi ý"
```

- [ ] **Step 2: Add the mirrored keys to `messages/en.json`**

```json
"placeholder": "Search keychains, models, figures…",
"submitAria": "Search",
"suggestionsAria": "Product suggestions",
"suggestionCount": "{count} suggestions"
```

- [ ] **Step 2b: Confirm no key was overwritten**

```bash
node -e "const d=require('./messages/vi.json');console.log(d.search.noResults, '|', d.search.resultsCount)"
```
Expected: `Không tìm thấy kết quả. | Hiển thị {count} kết quả cho` — unchanged.

- [ ] **Step 3: Verify both files are valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('ok')"
```
Expected: `ok`

- [ ] **Step 4: Write the failing test**

Create `components/layout/navbar/__tests__/search-combobox.test.tsx`. `next/navigation` and the fetch call are mocked so the test exercises only keyboard and ARIA behaviour.

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import Search from '@/components/layout/navbar/search';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const messages = {
  search: {
    placeholder: 'Search keychains, models, figures…',
    submitAria: 'Search',
    suggestionsAria: 'Product suggestions',
    suggestionCount: '{count} suggestions',
    noResults: 'No results found.',
  },
};

const suggestions = [
  { handle: 'model-a', title: 'Model A', image: '/a.jpg', price: '100000', currencyCode: 'VND' },
  { handle: 'model-b', title: 'Model B', image: '/b.jpg', price: '200000', currencyCode: 'VND' },
];

beforeEach(() => {
  push.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ suggestions }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSearch() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Search />
    </NextIntlClientProvider>,
  );
}

describe('Search combobox', () => {
  it('should expose the input as a combobox that starts collapsed', () => {
    renderSearch();
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('should expand and list options once suggestions arrive', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });

  it('should not set aria-activedescendant before any option is highlighted', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant');
  });

  it('should move the highlight with ArrowDown and track it in aria-activedescendant', async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = screen.getByRole('combobox');
    await user.type(input, 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}');
    const first = screen.getAllByRole('option')[0];
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', first.id);

    await user.keyboard('{ArrowDown}');
    const second = screen.getAllByRole('option')[1];
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', second.id);
  });

  it('should wrap from the last option back to the first', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should navigate to the highlighted product on Enter', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/product/model-a');
  });

  it('should submit the raw query on Enter when nothing is highlighted', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/search?q=model');
  });

  it('should close the listbox on Escape', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('should show a no-results affordance instead of an empty box', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ suggestions: [] }) })),
    );
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'zzzz');
    await waitFor(() => expect(screen.getByText('No results found.')).toBeInTheDocument());
  });
});
```

- [ ] **Step 5: Confirm `@testing-library/user-event` is installed**

Run:
```bash
ls node_modules/@testing-library/user-event/package.json
```
Expected: the path prints. If it is missing, install it:
```bash
node_modules/.bin/pnpm add -D @testing-library/user-event
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run components/layout/navbar/__tests__/search-combobox.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "combobox"`.

- [ ] **Step 7: Rewrite `components/layout/navbar/search.tsx`**

Replace the `Search` component (keep `SearchSkeleton`, but localize its placeholder too). Full replacement file:

```tsx
// components/layout/navbar/search.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { animate } from 'motion';
import Price from '@/components/price';
import type { SearchSuggestion } from '@/app/api/search/suggest/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { prefersReducedMotion } from '@/lib/animations/config';

export default function Search(): ReactElement {
  const t = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // The overlay is shown once a search has run, even with zero results, so the
  // shopper gets a "no matches" affordance rather than a silently empty box.
  const overlayVisible = open && searched;
  const hasSuggestions = suggestions.length > 0;
  const activeOptionId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  // Scale + fade the suggestion overlay in from the search icon origin (top
  // right), 200ms (spec §3). Reduced motion: appear instantly.
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el || !overlayVisible) return;
    if (prefersReducedMotion()) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
      return;
    }
    const controls = animate(
      el,
      { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] },
      { duration: 0.2, ease: 'easeOut' },
    );
    controls.finished
      .then(() => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      })
      .catch(() => undefined);
    return () => controls.stop();
  }, [overlayVisible]);

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data: { suggestions?: SearchSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setSearched(true);
          setActiveIndex(-1);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function goToProduct(handle: string): void {
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/product/${handle}`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Enter with an option highlighted selects that option instead of
    // submitting the raw query.
    const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
    if (active) {
      goToProduct(active.handle);
      return;
    }
    const q = value.trim();
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!overlayVisible || !hasSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative" role="search">
        <input
          type="search"
          name="q"
          role="combobox"
          aria-expanded={overlayVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder={t('placeholder')}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => searched && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-pill border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-300 focus:border-warm-300 focus:bg-warm-50 focus:shadow-soft-sm focus:outline-none dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500 dark:focus:border-warm-700 dark:focus:bg-warm-900/80"
        />
        <button
          type="submit"
          aria-label={t('submitAria')}
          className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400 transition-colors hover:text-warm-600 dark:text-warm-500 dark:hover:text-warm-300"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </form>

      <span aria-live="polite" className="sr-only">
        {overlayVisible
          ? hasSuggestions
            ? t('suggestionCount', { count: suggestions.length })
            : t('noResults')
          : ''}
      </span>

      {overlayVisible ? (
        <ul
          ref={overlayRef}
          id={listboxId}
          role="listbox"
          aria-label={t('suggestionsAria')}
          style={{ transformOrigin: 'top right' }}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-warm-200/80 bg-white shadow-soft-lg backdrop-blur-xl dark:border-warm-800/60 dark:bg-warm-900"
        >
          {hasSuggestions ? (
            suggestions.map((item, idx) => (
              <li
                key={item.handle}
                id={`${listboxId}-option-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => goToProduct(item.handle)}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === activeIndex
                    ? 'bg-warm-50 dark:bg-warm-800/50'
                    : 'hover:bg-warm-50 dark:hover:bg-warm-800/50'
                }`}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-warm-100 dark:bg-warm-800">
                  <Image
                    src={toNextImageSrc(item.image)}
                    alt={item.title}
                    fill
                    sizes="44px"
                    className="img-fit p-0.5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-warm-800 dark:text-warm-200">
                    {item.title}
                  </span>
                  <Price
                    amount={item.price}
                    currencyCode={item.currencyCode}
                    className="text-xs font-semibold text-warm-900 dark:text-warm-100"
                  />
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
              {t('noResults')}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function SearchSkeleton(): ReactElement {
  const t = useTranslations('search');
  return (
    <form className="relative w-full">
      <input
        placeholder={t('placeholder')}
        className="w-full rounded-pill border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400">
        <MagnifyingGlassIcon className="h-4 w-4" />
      </div>
    </form>
  );
}
```

Two changes worth calling out because they alter behaviour beyond ARIA:
- The `<button>` inside each option became a `<li role="option">` with an `onClick`. A nested interactive `<button>` inside a `role="option"` is invalid ARIA and would be unreachable to screen readers anyway.
- `overlayVisible` no longer requires `suggestions.length > 0`, so the zero-result case renders the "no matches" row the spec asks for. Confirm this does not leave a stale empty box when the input is cleared — the `< 2` branch resets `searched` to `false`, which closes it.

- [ ] **Step 8: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run components/layout/navbar/__tests__/search-combobox.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 9: Verify `SearchSkeleton`'s callers still work**

`SearchSkeleton` now calls `useTranslations`, so it must render inside `NextIntlClientProvider`. Find its callers and confirm each is inside the storefront layout:

```bash
grep -rn "SearchSkeleton" --include=*.tsx components app
```
Expected: every hit is under `components/layout/` or `app/[locale]/(storefront)/`. If one is outside the provider, it will throw at runtime — revert that file's placeholder to the literal string and note it.

- [ ] **Step 10: Run the full suite and type check**

Run:
```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```
Expected: tsc exits 0, all tests pass.

- [ ] **Step 11: Verify by keyboard in the browser**

With the dev server running, using **only** the keyboard:
1. Tab to the search input.
2. Type `mo hinh` — suggestions appear.
3. Arrow Down twice — the highlight moves and is visible.
4. Enter — navigates to the highlighted product.
5. Go back, type again, press Escape — the dropdown closes and the typed text remains.
6. Type `zzzzzz` — the "no results found" row appears rather than an empty box.
7. Confirm the debounce still holds (no request per keystroke) in the Network tab.

- [ ] **Step 12: Commit**

```bash
git add components/layout/navbar/search.tsx components/layout/navbar/__tests__/search-combobox.test.tsx messages/vi.json messages/en.json
git commit -m "fix(search): make the suggestion dropdown a keyboard-operable combobox

The dropdown carried only an aria-label, so keyboard and screen-reader users
could see results but never reach one. Adds combobox/listbox/option roles,
aria-activedescendant tracking, Arrow/Enter/Escape handling, a polite result
count, and a no-results row. The per-option button became the option element
itself, since a button nested in role=option is invalid. Placeholder and
submit label move into next-intl."
```

---

## Task 8: Route-level error and loading scaffolding

Spec §5. **Lowest priority — the spec itself marks this as the candidate to cut if scope needs trimming.** Measured TTFB is 60–380ms, so the skeletons will not visibly change perceived speed. `global-error.tsx` is the valuable half: it turns a blank white page into a recoverable one.

**Files:**
- Create: `app/global-error.tsx`
- Create: `app/[locale]/(storefront)/blog/loading.tsx`
- Create: `app/[locale]/(storefront)/profile/loading.tsx`

**Interfaces:**
- Consumes: `ProductGridSkeleton` from `@/components/product/product-grid-skeleton` (already used by `search/loading.tsx`).
- Produces: nothing.

Checkout is **deliberately excluded** — it is `force-dynamic` and auth-gated, and a skeleton there would imply progress on a page that may immediately redirect. `product/[handle]/loading.tsx` already exists; do not touch it.

- [ ] **Step 1: Create `app/global-error.tsx`**

This must be a client component and must render its own `<html>`/`<body>` — both because Next.js requires it of `global-error`, and because `app/layout.tsx` here renders no document shell. It sits outside `NextIntlClientProvider`, so copy is default-locale Vietnamese, same trade-off as Task 2.

```tsx
// app/global-error.tsx — last-resort boundary for errors thrown in the root
// layout itself, where the storefront error.tsx cannot catch them.
//
// Next.js requires this to be a client component rendering its own
// <html>/<body>. It also sits outside NextIntlClientProvider, so the copy is
// the default locale (vi) rather than translated.
'use client';

import { useEffect, type ReactElement } from 'react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-warm-50 text-warm-900 dark:bg-warm-950 dark:text-warm-100">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>
          <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
            Rất tiếc, trang này không tải được. Vui lòng thử lại trong giây lát.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 transition-all duration-200 hover:bg-warm-800 active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
            >
              Thử lại
            </button>
            <a
              href="/vi"
              className="inline-flex rounded-xl border border-warm-200/80 px-5 py-2.5 text-sm font-semibold text-warm-800 transition-all duration-200 hover:bg-warm-100/60 dark:border-warm-800/60 dark:text-warm-200 dark:hover:bg-warm-800/50"
            >
              Về trang chủ
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
```

The home link is a plain `<a>`, not `next/link` — a global error boundary should not depend on the router still being healthy.

- [ ] **Step 2: Create the blog loading skeleton**

Create `app/[locale]/(storefront)/blog/loading.tsx`, matching the structure of `search/loading.tsx`:

```tsx
import type { ReactElement } from 'react';

export default function BlogLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10">
      <div className="mb-8 h-8 w-56 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-warm-200/60 dark:border-warm-800/40">
            <div className="aspect-[16/10] w-full animate-pulse bg-warm-200 dark:bg-warm-800" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the profile loading skeleton**

Create `app/[locale]/(storefront)/profile/loading.tsx`:

```tsx
import type { ReactElement } from 'react';

export default function ProfileLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-screen-lg px-4 py-10">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-warm-200 dark:bg-warm-800" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-warm-200 dark:bg-warm-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify types compile and tests pass**

Run:
```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```
Expected: tsc exits 0, all tests pass.

- [ ] **Step 5: Verify no route's output changed**

With the dev server running:
```bash
for p in /vi /vi/blog /vi/search /vi/profile; do
  printf '%s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$p")"
done
```
Expected: each returns the same status it did before this task (`/vi/profile` redirects when signed out).

- [ ] **Step 6: Commit**

```bash
git add app/global-error.tsx "app/[locale]/(storefront)/blog/loading.tsx" "app/[locale]/(storefront)/profile/loading.tsx"
git commit -m "feat(errors): add a global error boundary and route loading skeletons

An error thrown in the root layout previously rendered a blank page with no
way out; global-error.tsx makes it recoverable. The blog and profile
skeletons match the existing search skeleton. Checkout is left out on
purpose: it is auth-gated and may redirect immediately, so a skeleton there
would imply progress that is not happening."
```

---

## Final verification

After all tasks are committed:

- [ ] **Full suite green**

```bash
node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit
```

- [ ] **Production build succeeds**

```bash
node_modules/.bin/next build
```
Expected: completes without error. This is the step that catches a client/server boundary mistake the dev server tolerates.

- [ ] **No stale theme tokens introduced**

```bash
grep -rn "filament-\|font-serif" app components --include=*.tsx
```
Expected: no hits in any file this plan created or modified.

- [ ] **Deploy verification is the user's step.** The agent shell cannot reach the Docker daemon. Once the user rebuilds and redeploys via Portainer, re-run the probes from Task 1 Step 7, Task 1 Step 8, and Task 6 Step 8 against `http://116.118.6.30:3000` instead of localhost.

- [ ] **Log any decision that diverged from the spec** in `DECISIONS.md`, in particular the Task 1 narrowing (no separate category fetch on the 404) if it stands.
