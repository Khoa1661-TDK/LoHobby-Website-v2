# Decisions

This file tracks all non-trivial technical decisions made during this project.
See `rules/common/decisions.md` for the logging format and rules.

---

## 2026-06-13 — Render storefront dynamically to containerize the image build
**Chosen:** Make the entire storefront render dynamically (`export const dynamic = 'force-dynamic'` on `app/[locale]/(storefront)/layout.tsx`, plus the CMS-backed metadata routes `app/manifest.ts` and the product OpenGraph image) so the production Docker image can be built without a database. The Dockerfile build stage also gets placeholder `DATABASE_URL`/`PAYLOAD_SECRET` env (build-stage only — never reaches the runtime image) for `prisma generate` / Payload config init, which resolve env but never connect.
**Alternatives:** (1) Build the image against a live, populated Postgres (host-networked throwaway or the real DB) to preserve static generation. (2) Move `next build` into the container entrypoint so it runs at startup when the DB is up. (3) Per-page `force-dynamic` only on the specific pages that fetch CMS data.
**Why:** User decision during dockerization (Option "make CMS pages dynamic"). The storefront layout fetches store branding, chat config, and navigation from Payload on every page, so static prerendering inherently connects to the DB at build — making the whole subtree dynamic decouples build from DB at a single point. For a self-hosted CMS shop, per-request rendering is fine at this scale (data is already cached via `unstable_cache`), and pages always reflect current CMS content with no rebuild on content edits. Per-page `force-dynamic` (alt 3) was tried first and proved to be whack-a-mole — the DB dependency lives in the shared layout, not individual pages. Building against a DB (alts 1/2) adds deploy-time DB coupling and rebuild-on-content-change, the wrong trade-off for a CMS site.
**Trade-offs:** The storefront loses static/ISR optimization — every request renders on the server (mitigated by existing tag-based caching). The build-stage placeholder env is a (harmless, non-secret) coupling that must stay in sync if Prisma/Payload change what they require at build.
**Revisit if:** Storefront traffic grows enough that per-request rendering becomes a bottleneck (reintroduce static/ISR by building against a populated DB, alt 1), or pages are split so that genuinely-static content no longer sits under the CMS-coupled layout.

---

## [Date] — Initial Stack Selection
**Chosen:** [Fill in]  
**Alternatives:** [Fill in]  
**Why:** [Fill in]  
**Trade-offs:** [Fill in]  
**Revisit if:** [Fill in]  

---

## 2026-06-02 — Blog storefront listing & category filtering
**Chosen:** Render the blog index and category pages by fetching all published posts via the existing `getPublishedPosts()` (capped at 500) and paginating/filtering in memory with `paginateList()`; filter the category route by `post.category.slug` in the page component rather than adding a category-scoped DB query to `lib/blog.ts`.
**Alternatives:** (1) Add a `getPostsByCategory(slug)` server-side query + a paginated `find` to `lib/blog.ts`. (2) Use Payload's native pagination per page request.
**Why:** Mirrors the established storefront listing pattern in `app/(storefront)/search/[collection]/page.tsx` (fetch-all → filter → `paginateList`), reuses the already-cached `getPublishedPosts` read, and keeps the feature change confined to the route layer without refactoring the functional blog data layer.
**Trade-offs:** In-memory pagination loads up to 500 summaries per request region; fine at blog scale but not for thousands of posts. Category filtering scans the full set each request (cheap, cache-backed).
**Revisit if:** Published post count approaches the 500 cap, or category pages need server-side pagination for performance.

---

## 2026-06-03 — CMS redirects reach Edge middleware via internal API fetch
**Chosen:** Edge middleware resolves the redirect map by `fetch`-ing the Node route `/api/redirects` (which serves the `unstable_cache`-backed `getValidRedirects()`), fronted by a 60s in-memory TTL cache and the Next data cache (tag `redirects`). Pure match/normalize helpers live in `lib/redirects-match.ts` (edge-safe); the Payload Local API stays in `lib/redirects.ts` (Node-only).
**Alternatives:** (1) Call `getValidRedirects()` directly in middleware — impossible: Edge runtime can't load Payload's `pg` driver (it's in `serverExternalPackages`), and `unstable_cache` reads aren't usable in middleware. (2) Upgrade Next to ≥15.2 + `experimental.nodeMiddleware` and run middleware in the Node runtime — framework upgrade with regression risk; the feature is still experimental. (3) Materialize redirects into `next.config.mjs redirects()` from a generated file — edge-native but not runtime-dynamic (needs rebuild/restart to apply). (4) Shared edge KV/Redis store — no such infra is configured (rate limiter is in-memory).
**Why:** Option chosen by user. Works on the current stack (Next 15.0.3, no KV) with no framework upgrade, gives admins instant effect via tag revalidation, and keeps the per-request cost to a cached map lookup. User picked it over the Node-middleware upgrade.
**Trade-offs:** Middleware now runs on storefront page paths (broadened matcher), adding a cached lookup per request; on a cold edge instance the first matched request pays one internal `fetch`. `/api/redirects` exposes the enabled redirect list unauthenticated (acceptable: redirects are inherently observable by hitting the old path) — middleware needs it pre-auth.
**Revisit if:** The project upgrades to Next ≥15.2 (switch to Node middleware + direct `getValidRedirects()`), adds an edge KV store, or redirect volume outgrows the 1000-rule fetch cap / exact-match model (e.g. needs wildcard/regex matching).

---

## 2026-06-02 — Shared PostCard component
**Chosen:** Add `components/blog/post-card.tsx` and reuse it in both the blog index and category listing routes.
**Alternatives:** Inline the card markup in each page (3 files only, as scoped).
**Why:** The index and category listings render an identical post grid; a shared card avoids ~40 lines of duplicated markup and follows the existing `components/product/product-card.tsx` convention.
**Trade-offs:** One file beyond the three originally enumerated for the task.
**Revisit if:** The two listings diverge enough that a single card no longer fits both.

---

## 2026-06-03 — Dedicated `navigation` global for footer & mobile menus
**Chosen:** Add a separate `navigation` Payload global (group "Settings"), distinct from `site-header`, holding `footerMenu` and `mobileMenu` as arrays of link columns (`heading` + repeatable `{ label, url, openInNewTab }`). Resolve/cache it in `lib/navigation.ts` (mirroring `lib/site-header.ts`: `unstable_cache` with `revalidate: false`, tag `navigation`, `afterChange` → `revalidateNavigationCache()`). Footer and mobile menu now render from this global; hardcoded footer link arrays were ported into `DEFAULT_FOOTER_MENU` / `DEFAULT_MOBILE_MENU` fallbacks used when the global is empty.
**Alternatives:** (1) Extend the existing `site-header` global with footer/mobile fields. (2) Keep mobile menu mirroring header `tabs` and add only a footer global.
**Why:** Footer and mobile layouts are column-of-links structures, structurally unlike the header's tab/dropdown model — a separate global keeps each schema focused and lets the two evolve independently. Fallback defaults preserve prior behavior so menus never render empty pre-configuration.
**Trade-offs:** Mobile navigation no longer mirrors the desktop header tabs — the two are now configured independently and can drift. `navbar/index.tsx` was touched (beyond the two files named in the task) to supply the new prop. `navigation` is not yet in the generated `GlobalSlug` union — run `payload generate:types` to make it first-class typed.
**Revisit if:** Admins find maintaining header + mobile menus separately redundant, or mobile should re-derive from header tabs.

---

## 2026-06-03 — First-party behavioral analytics (attribution, dwell, best/worst sellers)
**Chosen:** Build a first-party event pipeline — consent-gated client beacons → Node API routes → two Prisma models (`VisitSession`, `ProductViewEvent`) → aggregation in `lib/analytics/*` → new sections on the existing custom admin dashboard. Visitor identity is pseudonymous (random `anonId`); `customerId` is attached server-side from the session only. Best/worst sellers are aggregated from **Payload Orders `lineItems`** (the source of truth the existing dashboard already uses), not the Prisma `Order`/`OrderItem` mirror. Request validation uses the codebase's manual `typeof` idiom (e.g. `app/api/register/route.ts`), not a new zod dependency.
**Alternatives:** (1) Lean on GA4 custom events — rejected: data lives in Google, sampled, cannot join to real orders. (2) Store events as a Payload collection — rejected: heavier per write, clutters admin, not built for event volume. (3) Daily rollup table for views — deferred: direct indexed aggregates are fine at this store's scale.
**Why:** The order-linked questions (view→buy conversion, revenue-true best/worst sellers) require joining behavioral data to our own orders, which only a first-party store allows. Prisma already owns the non-Payload data, so events fit there naturally.
**Trade-offs:** Net-new capture code to maintain; dwell tracking is the most complex part for the least certain payoff. No daily rollup yet, so very high event volume would slow dashboard queries.
**Revisit if:** Dashboard aggregate queries get slow (add `ProductViewDaily` rollup), or the team finds the dwell metric unused (drop the product-view tracker, keep attribution + sellers).

---

## 2026-06-03 — Admin dashboard redesign stays on Payload design tokens
**Chosen:** Redesign only the `/admin` landing (`AnalyticsDashboard`) as a refined layer built on Payload's CSS theme variables (`--theme-elevation-*`, `--theme-success-*`, etc.), styled via scoped `.dash`/`.dash-*` classes in `app/(payload)/custom.scss` instead of inline styles.
**Alternatives:** (a) A distinct admin brand identity with a custom accent palette + display font; (b) a full custom override of Payload's chrome (sidebar/header/collection views).
**Why:** Payload owns the surrounding chrome and all 14 built-in collection list/edit views. A bespoke font/color world on the dashboard would visibly disconnect from those un-restyled views and break across Payload upgrades. Riding Payload's tokens keeps the dashboard cohesive with the rest of the panel and upgrade-safe. User selected this direction over the bolder options.
**Trade-offs:** Less visually distinctive than a custom brand theme — the dashboard reads as a polished Payload, not a wholly bespoke product. Accepted for maintainability.
**Revisit if:** The store wants a fully branded admin experience and is willing to own the cost of overriding/maintaining Payload chrome across upgrades.

---

## 2026-06-03 — Bespoke commerce admin pages use SCSS + Payload tokens, not Tailwind/shadcn
**Chosen:** Build the standardized layout wrapper for the custom commerce pages (coupons, gift cards, campaigns, reviews) as hook-free React in `src/payload/components/commerce/` (`CommercePage`, `CommerceEmptyState`), mounted in the Payload admin shell via `Gutter`/`SetStepNav` and styled by `.commerce-page*`/`.commerce-btn*`/`.commerce-empty*` classes in `app/(payload)/custom.scss` on Payload theme tokens.
**Alternatives:** (a) The brief's literal stack — Tailwind utilities + shadcn/ui DataTable + react-hook-form + zod; (b) build these as a standalone Next.js route group outside `/admin` where Tailwind/globals.css apply; (c) inject scoped Tailwind into the admin via custom.scss.
**Why:** `app/(payload)/layout.tsx` imports only `@payloadcms/next/css` + `custom.scss` — it does NOT load `globals.css`/Tailwind, so Tailwind utilities don't render inside `/admin`. shadcn/ui is also not installed (no `components/ui/`, no `cn()`), despite CLAUDE.md claiming it. User confirmed: pages live inside `/admin`, and shadcn was shorthand for "clean accessible tables/forms," not a hard requirement. This keeps the new pages cohesive with the existing `AnalyticsDashboard`/`.dash-*` and consistent with [2026-06-03 — Admin dashboard redesign stays on Payload design tokens].
**Trade-offs:** Design intent from the (Tailwind/shadcn-oriented) prompt sequence must be hand-translated into SCSS + Payload tokens each time; no off-the-shelf shadcn DataTable/form primitives, so tables/forms/validation are authored against Payload UI + the codebase's manual `typeof` validation idiom (per the analytics decision), not react-hook-form + zod.
**Revisit if:** The team decides to move commerce management OUT of `/admin` into a standalone dashboard app, at which point the Tailwind + shadcn stack becomes viable and these wrappers would be re-platformed.

---

## 2026-06-03 — Dual-language (EN/VI) storefront via next-intl, path-prefix routing
**Chosen:** Add `next-intl` for storefront UI translation. Locales `['vi','en']`, default `vi`, `localePrefix: 'always'` (both `/vi` and `/en` are explicit). Move `app/(storefront)/*` under `app/[locale]/(storefront)/*` (via `git mv` to preserve history); `(payload)`, `/api`, `/media` stay un-prefixed. Locale handling is folded into the existing `middleware.ts` (not `createMiddleware`) so the redirect→locale→rate-limit ordering stays explicit. Strings live in namespaced `messages/{vi,en}.json`. Scope is **UI chrome only** — CMS content (products/blog/pages) stays single-language; no Payload localization.
**Alternatives:** (1) `i18next/react-i18next` — client-first, fights RSC, hand-wired routing. (2) Hand-rolled dictionary + context — reinvents middleware/cookie/switcher/typing. (3) Cookie-only locale (no URL change) — not SEO-friendly, not shareable. (4) Full content localization via Payload `localized: true` fields — large content-migration cost, rejected as out of scope. (5) `localePrefix: 'as-needed'` (vi unprefixed) — rejected so both languages have consistent, shareable URLs.
**Why:** User decisions — UI-chrome-only scope, path-prefix routing, Vietnamese default, navbar switcher persisted via cookie. `next-intl` is the idiomatic Next 15 App Router choice: native path routing, RSC + client support (`getTranslations`/`useTranslations`), JSON catalogs (satisfies the "no scattered strings" frontend rule), and an automatic `NEXT_LOCALE` cookie.
**Trade-offs:** Restructuring 39 storefront route files under `[locale]` is invasive (git history preserved via `git mv`; relative imports like `../globals.css` re-pathed). API/middleware error strings (e.g. the 429 message) stay Vietnamese-only — no clean locale context at the edge. CMS content remains single-language, so a VI product page shows VI content under `/en`. Lands on the analytics branch; committed via explicit file staging to stay revertable apart from analytics work.
**Revisit if:** The store needs translated product/blog/page content (adopt Payload `localized` fields), localized SEO/hreflang, or a third locale.

---

## 2026-06-04 — Admin chrome retheme via single base-color ramp + @import fonts
**Chosen:** Restyle Payload's sidebar (`.nav*`) and header (`.app-header`/`.step-nav`) plus a global token retheme to a shadcn/ui "slate" look, all in `app/(payload)/custom.scss`. The whole light+dark elevation system is re-pointed by overriding ONE scale — `--color-base-0…1000` — on `html[data-theme='light'],html[data-theme='dark']`; Payload derives every `--theme-elevation-*`/border/input/button token from it (light straight, dark inverted). Chrome rules are kept UNLAYERED so they beat Payload's `@layer payload-default` without `!important`. Inter (body) + Plus Jakarta Sans (display) are loaded via a Google Fonts `@import` at the top of the SCSS.
**Alternatives:** (a) Override each `--theme-elevation-*` token individually for both themes; (b) load fonts via `next/font` in `app/(payload)/layout.tsx` and expose CSS vars; (c) build a fully custom Nav/AppHeader via `admin.components` swaps (icon mini-rail, ⌘K palette, profile dropdown).
**Why:** Re-pointing the single base ramp is dramatically less code, themes both modes at once, and survives Payload token renames across upgrades. Unlayered author styles win the cascade over Payload's layered chrome by rule, avoiding specificity wars. `@import` keeps the deliverable self-contained SCSS; the admin is behind auth so the blocking-fetch cost is irrelevant. Consistent with the prior two admin decisions (stay on Payload tokens, SCSS not Tailwind).
**Trade-offs:** `@import` fonts add a render-blocking request on `/admin` (acceptable, gated) vs. the `next/font` optimization used on the storefront. CSS alone cannot deliver three brief items — per-link Lucide icons, a persistent icon-only "mini rail", and the ⌘K command palette / profile dropdown — those need React component swaps via `importMap` and were explicitly deferred. Payload's native collapse (`.nav-toggler` slides `.nav` fully off-canvas) is reused rather than converted to a mini-rail.
**Revisit if:** The team wants the ⌘K palette / Lucide nav icons / mini-rail, at which point custom `Nav` + header action components are built and registered in `payload.config.ts`.

---

## 2026-06-04 — Live chat via embedded Zalo/Messenger SDKs
**Chosen:** Embed the official Zalo OA chat SDK and Facebook Messenger Chat Plugin as stacked floating bubbles (Messenger lifted above Zalo via CSS in `app/globals.css`), configured in the `StoreSettings` admin global (new "Live chat" tab), loaded on every storefront page via a `'use client'` `LiveChatWidget` using `next/script` `strategy="lazyOnload"`. Config flows through `resolveChatConfig()`/`getChatConfig()` in `lib/store-settings.ts`; a platform is treated as off unless its toggle is on AND its ID is non-empty.
**Alternatives:** (1) Lightweight link-out contact bubble (`zalo.me` / `m.me` / `tel:`) with no third-party scripts. (2) Consent-gated loading via the existing `hasAnalyticsConsent()` + `CONSENT_EVENT`. (3) Env-var config (`NEXT_PUBLIC_*`) instead of admin. (4) Show only Messenger when both IDs set, to avoid two bubbles.
**Why:** User decisions — embedded SDKs for real in-page chat; admin config to fit the white-label storefront with no redeploy and cached/revalidated like the rest of the global; always-load because chat is treated as functional for a VN-focused shop; both bubbles stacked (standard VN-shop pattern, no JS coordination between SDKs).
**Trade-offs:** Always-load brings Facebook/Zalo third-party cookies before cookie consent — weaker privacy posture than the consent-gated `Analytics`, a compliance risk in stricter (EU/GDPR) markets. Two heavy vendor SDKs add bottom-right bubbles whose stacking offsets are vendor-CSS-dependent and may need tuning. Messenger requires a manual one-time domain whitelist in the Facebook Page settings (Inbox → Chat Plugin → Whitelisted Domains) that cannot be automated — the bubble will not appear until done.
**Revisit if:** Expanding to EU/GDPR markets (gate behind consent), the dual SDKs hurt Core Web Vitals (switch to link-out bubbles), or vendor CSS changes break the bubble stacking offsets.

---

## 2026-06-03 — Seller order notifications via Zalo OA
**Chosen:** Notify the seller through a Zalo Official Account message on order creation, triggered by a Payload `Orders.afterChange` hook (operation === 'create'). OA credentials live in an admin-managed `notification-settings` global; access tokens auto-refresh and the rotated refresh token is persisted back.
**Alternatives:** Zalo ZNS template messages (rejected: template approval + per-message cost, aimed at customers); calling the notifier directly from the checkout route (rejected: misses non-checkout order sources, couples checkout to notifications); a polling/queue worker (rejected: over-engineered for a single-seller ping).
**Why:** OA messages are free and adequate for notifying one internal recipient; the afterChange hook captures every order source and mirrors the existing inventory-sync hook; admin-managed config fits the template's "configure it to liking" goal. Notification is fire-and-forget so Zalo downtime never blocks an order.
**Trade-offs:** OA "consultation" message window can expire if the seller goes silent for a long time; the OA app secret/tokens are stored in plaintext in the admin global (admin-only access). Encrypting via the existing PAYMENT_SECRETS_KEY pattern is a noted follow-up.
**Revisit if:** the seller needs customer-facing notifications, multi-recipient/team alerts, or per-status (paid/shipped) notifications; or if plaintext secret storage becomes unacceptable.

---
