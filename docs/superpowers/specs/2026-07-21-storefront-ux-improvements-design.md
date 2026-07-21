# Storefront UX Improvements — Design

**Date:** 2026-07-21
**Status:** Approved for planning
**Verified against:** the deployed Portainer instance at `http://116.118.6.30:3000` (not localhost)

---

## Context

A UX review of the storefront, conducted against the **deployed** instance rather than a
local dev server. That distinction produced the single highest-impact finding in this
document (§1) — one that is structurally invisible on `localhost` and invisible to anyone
testing from a machine on the project's tailnet.

### Method

Findings were gathered by HTTP probe against the running container: response codes and
redirect chains, rendered HTML (headings, `alt`/ARIA coverage, meta tags), asset transfer
sizes and cache headers, and timing. Source files were read to confirm each symptom's
cause before it was written down here.

### What is already good — explicitly out of scope

The review found the presentation layer in good shape. These are recorded so a future pass
does not "improve" them:

- **Accessibility fundamentals.** Single `h1` on the homepage, all 19 homepage images carry
  `alt` text and `loading="lazy"`, 53 `aria-label`s, real `sr-only` and focus handling,
  `aria-current` on active nav.
- **Performance.** gzip enabled on HTML and JS; static assets served
  `Cache-Control: public, max-age=31536000, immutable`; TTFB 60–380ms across all measured
  routes.
- **Security headers.** CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` all present.
- **Add-to-cart feedback.** `sonner` toast on error, `useTransition` pending state, spinner
  in the button, disabled while pending.
- **Search empty states.** Correct localized copy already exists for no-results and
  no-products-in-category.

### Explicitly out of scope

**Domain, TLS, and Google OAuth.** The review surfaced that the deploy runs on a raw IP over
plain HTTP, which makes Google OAuth impossible (Google rejects IP redirect URIs) and forces
two feature flags to stay open as security debt (`REQUIRE_EMAIL_VERIFICATION=false`,
`ALLOW_CREDENTIALS_ADMIN=true`, both already recorded in `DECISIONS.md` 2026-07-15 and
2026-07-17, tracked in `.claude/phases/RESTORE-ADMIN-GATE-pending.md`).

**User decision (2026-07-21): do not pursue this.** Google sign-in is not required. This spec
therefore treats email/password as the sole login path and does not propose domain
acquisition, TLS termination, or OAuth work. §1 below is included *only* because it is a
one-variable config fix with direct customer-facing impact, independent of TLS.

**Guest checkout.** Was deliberately removed in `aebbda1` ("require a verified email and drop
guest checkout"). Re-adding it means reversing a considered decision and is not in this scope.
Noted here so the option is not silently lost: `components/checkout-form.tsx` still carries an
unreachable `requireEmail` guest-email branch (see `DECISIONS.md` 2026-07-14), and
`Orders.customer` is not a required field, so the schema would already tolerate guest orders.

---

## 1. Public origin is a private tailnet address

**Priority:** highest impact per unit of effort in this document. Config only, no code.

### Problem

The running container advertises a private Tailscale address as its public origin. On a
product page:

```
<link rel="canonical" href="http://100.73.36.117:3000"/>
og:url    = http://100.73.36.117:3000/product/mo-hinh-cheems-bonk
og:image  = http://100.73.36.117:3000/media/sp-11085546208-0.jpg
twitter:image = http://100.73.36.117:3000/media/sp-11085546208-0.jpg
```

`100.73.36.117` is not reachable from the public internet. It resolves from developer
machines only because they are on the same tailnet — which is exactly why localhost and
tailnet testing cannot catch this.

Probing both hosts shows they are **two different instances**, not one box with two
addresses:

| Host | `canonical` it reports |
|---|---|
| `116.118.6.30:3000` (public VPS) | `http://100.73.36.117:3000` |
| `100.73.36.117:3000` (tailnet box) | `http://localhost:3000` |

So the public VPS is advertising the private address of a *different machine*.

### Impact

Facebook, Zalo, and Messenger crawlers run on the public internet and will time out fetching
`og:image`. **Every product link shared to social renders with no image and no title.** For a
storefront where social sharing is a primary acquisition channel, this silently removes it.
Secondarily, `canonical` points search engines at an unreachable URL.

### Fix

Set `APP_URL=http://116.118.6.30:3000` in the Portainer stack environment and redeploy.
No code change. `APP_URL` is read at runtime (not `NEXT_PUBLIC_*`), so no rebuild is needed.

This is performed by the user — the agent shell cannot reach Docker (see
`docker-daemon-needs-sudo`).

### Acceptance criteria

- `curl http://116.118.6.30:3000/vi/product/<handle>` returns `og:url`, `og:image`,
  `twitter:image`, and `canonical` all on host `116.118.6.30:3000`.
- The URL in `og:image` returns `200` when fetched from a host **not** on the tailnet.
- No occurrence of `100.73.36.117` or `localhost` in the rendered HTML of `/vi` or a PDP.

---

## 2. Unmatched URLs hit an unbranded, English, dead-end 404

**Priority:** high impact, small effort.

### Problem

Requesting `/vi/anything-that-does-not-exist` serves Next.js's built-in error page:
`404: This page could not be found.` — English, unstyled, and containing **no** navbar,
footer, logo, search, or link back into the store. Verified: zero `<nav>`, `<footer>`,
`<header>`, or `<img>` elements in the response.

A branded `app/[locale]/(storefront)/not-found.tsx` does exist, but unmatched URLs never
reach it: there is no root `app/not-found.tsx`, and an unmatched path under `[locale]`
does not resolve into the storefront segment.

The existing branded file has two further problems:

1. **Stale visual identity.** It uses `font-serif` and `filament-500`, from the pre-Lô Hobby
   maker theme. Current storefront pages (e.g. `checkout/page.tsx`) use `font-display` and
   the `warm-*` scale.
2. **Not localized.** Strings are hardcoded Vietnamese despite the site running `next-intl`
   with `vi` and `en` locales.

### Impact

Product handles change and old links get shared. Every stale link is currently a customer
who lands on a blank English error with no path back into the store.

### Fix

Three parts:

1. **Catch unmatched locale routes.** Add a catch-all route segment under the storefront
   group that immediately calls `notFound()`, so unmatched `/[locale]/*` paths render the
   storefront `not-found.tsx` *inside the storefront layout* — with navbar, footer, and
   search intact.
2. **Retheme and localize** `app/[locale]/(storefront)/not-found.tsx` onto the current
   identity (`font-display`, `warm-*`, matching the `checkout/page.tsx` empty-cart block),
   and move its strings into `messages/vi.json` and `messages/en.json` under a `notFound` key.
3. **Add a root `app/not-found.tsx`** for paths that never match a locale at all. This sits
   outside the storefront layout, so it is a minimal self-contained branded page: store name,
   message, and a link to `/`. It cannot use `next-intl` (no locale context), so it uses
   Vietnamese as the default-locale fallback.

Beyond a home link, the storefront 404 should offer a search entry point and links to top
categories, so the page is a recovery point rather than a terminus.

### Risks to verify during implementation

- A catch-all segment must not shadow real routes. Next.js ranks catch-all lowest, so
  `product/[handle]`, `blog/[slug]`, etc. should still win — **this must be explicitly
  verified** by probing every existing storefront route after the change, not assumed.
- The catch-all lives inside `[locale]/(storefront)`, so it cannot intercept `/api/*`,
  `/admin`, or `/media/*`. Confirm by probe.

### Acceptance criteria

- `/vi/does-not-exist` returns HTTP 404 **and** HTML containing navbar and footer markup.
- The rendered copy is Vietnamese on `/vi/...` and English on `/en/...`.
- No `filament-` or `font-serif` classes remain in the not-found components.
- Every pre-existing storefront route (`/vi`, `/en`, `/vi/search`, `/vi/product/<handle>`,
  `/vi/blog`, `/vi/login`, `/vi/checkout`, `/vi/profile`, `/vi/about`, `/vi/contact`,
  `/vi/faq`) returns its previous status code, unchanged.
- `/api/auth/providers` and `/media/<file>` are unaffected.

---

## 3. No free-shipping progress in the cart

**Priority:** high value, small effort.

### Problem

`freeShippingThresholdVnd` is referenced only in `components/checkout-form.tsx`. The cart
modal shows subtotal, then `shipping: shippingAtCheckout` ("calculated at checkout"), then
total. The shopper learns about the free-shipping threshold only *after* committing to
checkout — past the point where they could add an item to qualify.

### Fix

`components/cart/index.tsx` is an async server wrapper that already fetches the cart. Extend
it to also call `getShippingSettings()` and pass `freeShippingThresholdVnd` into `CartModal`
as a prop. This follows the existing server-fetch/client-render split; no client-side data
fetching is introduced.

In `components/cart/modal.tsx`, render above the subtotal row:

- **Below threshold:** "Mua thêm {amount} để được miễn phí vận chuyển" with a progress bar
  showing `subtotal / threshold`.
- **At or above threshold:** a confirmation that shipping is free.

Amounts render through the existing `Price` component. Strings go through `next-intl`
(the modal already uses `useTranslations`), with keys added to `messages/vi.json` and
`messages/en.json`.

### Important constraint

`lib/shipping-settings.ts` defaults `freeShippingThresholdVnd` to `0`. When the threshold is
`0` the feature is **disabled** and the component must render nothing — no progress bar, no
"free shipping" message. This means the feature is a **no-op until a threshold is configured**
in the Payload `ShippingSettings` global. Implementation must not treat `0` as "everything
ships free."

### Acceptance criteria

- Threshold `0` → no free-shipping UI renders anywhere in the modal.
- Threshold set, subtotal below it → remaining amount is correct and the bar is proportional.
- Threshold set, subtotal at or above it → free-shipping confirmation renders.
- Copy renders correctly in both `vi` and `en`.
- Unit tests cover the three threshold states (below / at / above) and the disabled case.

---

## 4. No dedicated cart page

**Priority:** medium impact, medium effort.

### Problem

The cart exists only as a modal (`components/cart/modal.tsx`); `/vi/cart` returns 404. This
means no bookmarkable or shareable cart URL, no browser-back affordance, and a cramped
editing surface on mobile — where a slide-over competes with the keyboard and viewport.

### Fix

Add `app/[locale]/(storefront)/cart/page.tsx` as a server component mirroring the data
fetch already used by the checkout page: `getCart(userId)` plus `getShippingSettings()`.
It renders a full-width cart: line items with images, quantity controls, per-line and order
subtotals, the free-shipping progress element from §3, a primary checkout CTA, and the
existing `CartCrossSell`.

It reuses the existing server actions in `components/cart/actions.ts` — no new mutation path.

The cart modal gains a "view full cart" link to this route.

An empty state mirrors the existing empty-cart block in `checkout/page.tsx` (heading, body,
browse CTA) for visual consistency.

### Trade-off

Line-item rendering would be duplicated between the modal and the page. To avoid divergence,
extract a shared line-item component used by both. This is a small refactor *in service of*
the feature, not an unrelated cleanup — but it touches the modal, so it must be a separate
commit from the page addition per `existing-code.md` §3.

### Acceptance criteria

- `/vi/cart` and `/en/cart` return 200 and render current cart contents.
- Quantity update and line removal work from the page and persist (verified by re-fetch).
- Empty cart renders the empty state, not a broken or blank layout.
- The modal and the page show identical totals for the same cart.
- Free-shipping progress behaves per §3 on the page.

---

## 5. Missing route-level error and loading scaffolding

**Priority:** low-to-medium. Deliberately ranked below §3 and §4.

### Problem

- Only `search/` has a `loading.tsx`. Product, blog, profile, and checkout have none.
- There is no `app/global-error.tsx`, so an error thrown in the root layout renders a blank
  page with no recovery path.

### Honest assessment of value

Measured TTFB is 60–380ms across all routes. Loading skeletons pay off in proportion to how
long the user waits, so the perceived-performance gain here is **materially smaller** than it
would be on a slow deployment. This item is included for robustness and consistency, not
because it will visibly change how fast the site feels. It is ranked accordingly and is a
reasonable candidate to cut if scope needs trimming.

`global-error.tsx` is the more valuable half: it converts a blank white page into a recoverable
error state.

### Fix

- Add `app/global-error.tsx`. Per Next.js requirements it must render its own `<html>` and
  `<body>` tags, and it must be a client component. Include a reset action and a link home.
- Add `loading.tsx` to `product/[handle]`, `blog`, and `profile`, matching the structural
  skeleton style already established in `search/loading.tsx`.

Checkout is intentionally excluded: it is `force-dynamic` and auth-gated, and a skeleton there
risks implying progress on a page that may immediately redirect.

### Acceptance criteria

- `app/global-error.tsx` exists, is a client component, renders `<html>`/`<body>`, and offers
  reset plus a home link.
- New `loading.tsx` files match the existing skeleton's structure and theme tokens.
- No route's final rendered output changes.

---

## 6. No search suggestions

**Priority:** genuine improvement, largest build. Sequenced last.

### Problem

`components/layout/navbar/search.tsx` has no debounce, suggestion, or autocomplete logic.
Search is submit-then-navigate: the shopper must type a full query and load a results page
before learning whether anything matches.

### Fix

Add a debounced suggestion dropdown to the navbar search. On input (debounced ~200ms, minimum
2 characters), query the existing `/api/search` endpoint for a small result set and render
product suggestions with thumbnail, title, and price. Selecting one navigates directly to the
PDP; submitting still goes to the full results page.

Accessibility is a hard requirement, not a follow-up — this is a combobox and must behave like
one:

- `role="combobox"` on the input with `aria-expanded` and `aria-controls`
- `role="listbox"` on the dropdown, `role="option"` on each item
- `aria-activedescendant` tracking the highlighted option
- Full keyboard support: Up/Down to move, Enter to select, Escape to dismiss
- Results announced via a polite live region

This bar is set deliberately high because the existing storefront already meets a strong
accessibility standard (see "What is already good"), and this feature must not regress it.

### Verification needed during implementation

Confirm `/api/search` accepts a result-limit parameter and returns image and price fields. If
it does not, extending it is part of this item.

### Acceptance criteria

- Typing ≥2 characters shows suggestions; fewer than 2 shows none.
- Requests are debounced — one in-flight request per pause, not one per keystroke.
- Full keyboard operation works without a mouse.
- Empty results render a "no matches" affordance, not an empty box.
- Submitting still navigates to the full search results page.
- Copy is localized in `vi` and `en`.

---

## Implementation order

| # | Item | Owner | Effort |
|---|---|---|---|
| 1 | `APP_URL` fix in Portainer | User | ~1 min, no code |
| 2 | Branded, localized, route-catching 404 | Agent | Small |
| 3 | Free-shipping progress in cart modal | Agent | Small |
| 4 | Dedicated `/cart` page | Agent | Medium |
| 5 | `global-error.tsx` + `loading.tsx` | Agent | Small |
| 6 | Search autocomplete | Agent | Large |

Items 2–6 are independent of item 1 and of each other, except that §4 consumes the component
built in §3. They can be committed separately.

## Verification approach

Per user decision (2026-07-21): the agent verifies via HTTP probe against
`http://116.118.6.30:3000`; the user performs the Docker build and Portainer redeploy, since
the agent shell cannot reach the Docker daemon.

Each item's acceptance criteria above are written to be checkable by `curl` against the
deployed instance, plus unit tests where logic warrants them (§3 threshold states, §6 debounce
and keyboard handling).

Local `tsc --noEmit` and the Vitest suite must pass before any change is handed over for
deploy. Test files must import `describe`/`it`/`expect` from `vitest` explicitly, or
`tsc --noEmit` fails.

## Revisit if

- A domain and TLS are acquired — §1 changes from an IP to a hostname, and the OAuth and
  verification work currently out of scope becomes viable again.
- Social traffic does not recover after §1 — re-examine whether crawlers are being blocked by
  something other than origin (CSP, rate limiting in `middleware.ts`).
- Search analytics show high no-result rates — §6 rises in priority above §4.
