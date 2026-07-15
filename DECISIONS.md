# Decisions

This file tracks all non-trivial technical decisions made during this project.
See `rules/common/decisions.md` for the logging format and rules.

## 2026-06-24 — Cart abandonment metric sourced from events, not the Payload `carts` collection
**Chosen:** Compute cart abandonment + the ATC funnel from Prisma `AddToCartEvent` (the cart universe) joined to a new `PurchaseEvent` table (conversions), matching on `anonId` OR `customerId`.
**Alternatives:** (1) Keep reading the Payload `carts` collection; (2) start persisting every storefront cart into that collection on the add-to-cart hot path.
**Why:** The metric read the Payload `carts` collection, but the storefront never writes there (live carts live in an httpOnly cookie + Prisma `PersistedCart`). So the collection is always empty and the metric always read zero. The event tables are already populated, event-sourced (ranged by `createdAt`), and cover guests.
**Trade-offs:** Conversion now means "completed checkout" (order created), not "payment captured" — so a created-then-canceled order counts as converted. COD/gateway-pending orders correctly count as converted (they would wrongly read as abandoned under a paid-only definition). Requires a client→server `anonId` handoff at checkout and a DB migration.
**Revisit if:** We need payment-captured conversion specifically, or gateway-stage abandonment as its own funnel step.

## 2026-06-24 — Guest carts attributed via an `anonId` stamp at checkout
**Chosen:** Add a `PurchaseEvent { anonId, customerId, orderCode }` row at order creation, with `anonId` sent from the checkout client. Abandonment matches an ATC session to a checkout by `anonId` (guests + same-device) or `customerId` (cross-device logged-in).
**Alternatives:** Restrict the metric to logged-in shoppers only (guests have no join key between cart and order); or add `anonId` as a column on the order instead of a dedicated event table.
**Why:** Guest checkout exists, and guests are the majority. Without a join key every guest cart reads as abandoned. The stable `anonId` (localStorage) is the only id shared between a guest's add-to-cart events and their checkout. A dedicated Prisma table mirrors the existing `AddToCartEvent` pattern and keeps an additive, low-risk migration.
**Trade-offs:** Relies on the client sending `anonId` (lost if JS/localStorage blocked); the write is best-effort (swallowed on failure) so a dropped write undercounts conversions slightly.
**Revisit if:** We move order storage fully to Prisma (could fold `anonId` onto the order) or need server-authoritative attribution.

## 2026-06-24 — Analytics consent is default-on with explicit opt-out
**Chosen:** Record first-party, pseudonymous analytics by default; suppress only when the visitor explicitly opts out (`cookie-consent=rejected`).
**Alternatives:** Keep the hard opt-in gate (record only after "accept"); or remove the consent mechanism entirely.
**Why:** User decision (2026-06-24). The opt-in gate undercounted the majority of visitors, making cart/funnel metrics partial. The data is first-party and pseudonymous (random localStorage ids, own DB, no third-party trackers, no PII beyond a logged-in user id) — the lowest-risk category for default-on.
**Trade-offs:** Default-on without explicit consent carries ePrivacy/GDPR risk if selling to EU/UK buyers; mitigated by keeping a working opt-out + privacy-policy link. Lower risk than removing consent entirely (which was rejected).
**Revisit if:** The store targets EU/UK customers or adds any third-party/PII tracking — move back to opt-in.

---

## 2026-07-14 — Admin identity gated on Google OAuth provider, not email alone
**Chosen:** `getAdminUser()` requires both an allowlisted email AND `session.user.provider === 'google'`. `/api/register` now rejects any email in `ADMIN_EMAILS` with 403. `lib/admin-emails.ts` fails closed (empty allowlist) when `ADMIN_EMAILS` is unset — the `your-email@gmail.com` placeholder fallback is removed.
**Alternatives:** Keep the fallback but document it as "must be set in prod"; rely solely on blocking admin emails at `/api/register` without also gating on provider.
**Why:** A security audit found that `POST /api/register` let anyone create a password account for any unclaimed email, including an admin address, and the hardcoded fallback became a live public admin on any deploy that forgot `ADMIN_EMAILS`. Blocking registration alone still left a race: an attacker could register the admin's email before the real admin's first Google sign-in. Gating admin status on the OAuth provider closes that race even if a credentials account with that email ever exists.
**Trade-offs:** An admin can never use the credentials (password) provider — Google sign-in is now mandatory for admin access. Acceptable since Google is already the intended admin flow.
**Revisit if:** A non-Google SSO provider is added for admins — the provider check needs to allowlist it explicitly.

## 2026-07-14 — Pinned `images.remotePatterns` to `cf.shopee.vn`; `http: '**'` is dev-only
**Chosen:** Production `remotePatterns` is `[{ protocol: 'https', hostname: 'cf.shopee.vn' }]`; the wide-open `http: '**'` LAN-dev pattern is now spread in only when `NODE_ENV !== 'production'`.
**Alternatives:** Keep `https: '**'` since the storefront could in principle need arbitrary image hosts; add a broader allowlist of speculative hosts.
**Why:** Security audit flagged `hostname: '**'` (both http and https) as a blind SSRF/open-proxy primitive via the Next.js image optimizer (e.g. `http://169.254.169.254/...` cloud metadata). Grepping `scripts/data/shopee-catalog.json` confirmed the real, imported product catalog's images all come from `cf.shopee.vn` — no other host is in production use, and there is no S3/Cloudinary configured (Payload media is same-origin).
**Trade-offs:** If a future data source introduces images from a new host, `remotePatterns` must be updated or those images will 400. This is an intentional trade — an allowlist that requires a deliberate code change beats an open proxy.
**Revisit if:** The product catalog moves to a different image CDN/host, or Payload media moves to external object storage.

## 2026-07-14 — CSP flipped to enforcing, `unsafe-inline`/`unsafe-eval` kept for now
**Chosen:** `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (enforcing), directive body unchanged (`script-src 'self' 'unsafe-inline' 'unsafe-eval'` still present).
**Alternatives:** Also remove `unsafe-inline`/`unsafe-eval` and migrate to nonces in the same change.
**Why:** Audit flagged Report-Only as providing zero real XSS defense-in-depth. Enforcing the existing policy immediately blocks any resource-loading/framing XSS vector at no cost, since the directive body was already tuned against real traffic in Report-Only mode. Removing `unsafe-inline`/`unsafe-eval` requires nonce plumbing through the Payload admin bundle and Next.js runtime, which is materially riskier to do blind alongside four other concurrent security fixes.
**Trade-offs:** Inline/eval'd script injection is still not blocked by CSP — the policy mainly now stops exfiltration/framing/foreign-resource vectors, not script injection itself.
**Revisit if:** Ready to invest in nonce-based CSP for the admin panel — track as a follow-up, not done here.

## 2026-07-14 — `clientIp()` trusts the last `X-Forwarded-For` hop, not the first
**Chosen:** Rate-limit bucketing in `middleware.ts` now keys on the last comma-separated hop of `X-Forwarded-For` (falls back to `X-Real-Ip`, then `'unknown'`).
**Alternatives:** Read the IP from the raw socket/connection instead of any header; require a dedicated trusted header set only by the reverse proxy.
**Why:** The first hop is fully attacker-controlled — a client can send an arbitrary `X-Forwarded-For` value, generating a fresh rate-limit bucket per request and bypassing login/register/checkout throttling entirely. This deploy's standard (see `~/.claude/rules/common/deploy.md`) puts Caddy/nginx in front of the app, which appends (not overwrites) `X-Forwarded-For`, so the last hop is the proxy's own observed connection IP — the one hop the client cannot forge.
**Trade-offs:** This assumes the reverse proxy is configured to append rather than blindly forward a client-supplied header. If that assumption doesn't hold in a given deployment, the last hop can still be spoofed — proxy config is a hard dependency of this fix, not just a nice-to-have.
**Revisit if:** The deploy topology changes (e.g. a CDN in front of the proxy) — re-verify which hop is actually trustworthy.

## 2026-07-14 — Per-user random salt added to Payload admin password derivation
**Chosen:** `derivePayloadPassword(email, salt)` mixes a random per-user `ssoSalt` (stored on the Payload `users` row, lazily backfilled) into the HMAC input, instead of deriving purely from `(PAYLOAD_SECRET, email)`. A forced password reset also rotates the salt.
**Alternatives:** Leave the derivation as pure `HMAC(secret, email)` and rely solely on secrets-manager hygiene; store a full random password per user instead of deriving one (breaks the self-healing SSO-cookie flow).
**Why:** Audit found that a leaked `PAYLOAD_SECRET`/`AUTH_SECRET` alone was sufficient to compute every admin's Payload login password from their email — no per-user secret was involved. The salt narrows that blast radius: the leaked secret alone is no longer enough, the attacker also needs each user's stored salt (DB-only, not in any env var or image).
**Trade-offs:** Existing admin rows have `ssoSalt = null` until their next `ensurePayloadAdminUser` call (lazy backfill) — the migration only adds the nullable column, it doesn't backfill data. Requires a manual `payload migrate` run before this takes effect (see `src/migrations/20260714_090000_users_sso_salt.ts`, not yet applied).
**Revisit if:** The SSO bridge is redesigned to avoid password derivation entirely (e.g. a dedicated internal auth strategy).

---

---

## 2026-06-24 — Mirror-on-create with LLM auto-translation across locales
**Chosen:** Add a stable per-block `blockKey` (UUID) to every block, persisted across saves (unlike Payload's `id`, which is stripped by `stripBlockIds`). An `afterChange` hook on `Pages` diffs the active locale's `layout` against its prior state by `blockKey` and mirrors structural changes (add/delete/reorder) to the other locale — translating the text fields of newly-added blocks via OpenRouter (Llama 3.3 70B free, OpenAI-compatible SDK). Field-level edits do not propagate. Theme colors come along automatically because they are paired sibling fields inside each block.
**Alternatives:** (1) Mirror at the editor/client layer by issuing two PATCHes on add. (2) An explicit "Mirror to <locale>" button instead of automatic. (3) Treat theme as a separate Payload locale dimension (vi-light/vi-dark/en-light/en-dark). (4) A dedicated translation API (DeepL/Google) instead of an LLM.
**Why:** A Payload `afterChange` hook is the only layer that covers both the visual editor and raw admin edits, and is the natural place to run a structural diff + translation. The client-mirror (alt 1) would miss direct admin edits; the manual button (alt 2) is easy to forget and leaves locales out of sync. Theme-as-locale (alt 3) was already rejected in the 2026-06-22 spec — it explodes locale count and conflates language with appearance. The existing `stripBlockIds` behavior (which removes `id` to avoid cross-locale PK collisions) makes Payload's `id` unusable for stable diffing, hence the separate `blockKey`. LLM translation over DeepL because the user has an OpenRouter account and wants a free option; Llama 3.3 70B free is good quality for vi↔en. Best-effort contract (API failure → mirror structure anyway with source text + logged warning) keeps saves from ever blocking on a translation outage.
**Trade-offs:** Structural sync assumes the two locales are meant to be parallel — a block deleted in `vi` is deleted in `en` (by design), though `en`-only blocks are preserved. Free-model translation quality is below DeepL-grade; marketing tone may need a manual pass. Pre-`blockKey` legacy blocks mirror+translate on first sync (one-time, bounded). Rich text (Lexical) is copied verbatim in v1, not translated — flagged for a follow-up spec.
**Revisit if:** True locale independence (letting structures diverge) becomes needed, or translation quality demands a paid model / dedicated MT API, or rich-text translation becomes a priority.

---

## 2026-06-23 — Render the page-builder preview via a per-block server route (not client-side)
**Chosen:** The visual-editor preview renders every block through a single-block RSC route (`/[locale]/build/[slug]/preview/block?block=<json>`), seeded by server-rendered nodes for the initial paint. On edit, only the changed block re-fetches its own server render (~200ms debounce); the editor pushes layout state into the iframe over `postMessage`, decoupled from autosave.
**Alternatives:** (1) The originally-specced design: render the 14 "presentational" blocks in the iframe's client bundle for instant, zero-round-trip updates, with only the 4 data blocks server-rendered. (2) Keep the old `save → router.refresh()` full-page re-render. (3) Make every block component client-safe (split server-only deps out of each block) so client-side rendering becomes viable.
**Why:** Alt 1 was implemented first but the production build failed twice: the storefront block components have server-only transitive imports (`react-dom/server` is forbidden in the app graph; `next/cache` `revalidateTag` via `lib/page-builder.ts`; `payload`/`prisma`), so importing any block into the client bundle breaks `next build`. Per the two-attempt debugging rule, brute-forcing the client-render path was the wrong move — the codebase's blocks are fundamentally server components. The per-block server route still delivers the core win (one block re-renders per edit instead of the whole page + auth + branding), and it builds cleanly because the iframe never imports a block.
**Trade-offs:** Each edit costs a single-block server round-trip (~200–400ms after a pause) instead of being truly instant; injected data-block markup is non-interactive in preview (fine for a layout preview); block-config is passed in the URL query (small for realistic blocks, but very large blocks could hit URL limits — would fall back to reading the saved draft).
**Revisit if:** We want truly instant presentational edits — then do alt 3 (extract `blockAppearanceClasses`/types into a client-safe module and decouple each presentational block from server-only imports), which would let those blocks render in the client bundle.

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

## 2026-06-08 — Analytics dashboard time-window selector plumbing
**Chosen:** Use Payload 3 `searchParams` prop passed to the dashboard view component — `PeriodSelector` writes URL query params (`?period=7d`, `?from=...&to=...`) and `AnalyticsDashboard` reads them server-side via `resolvePeriod(props.searchParams)`.
**Alternatives:** (1) Cookie fallback: selector writes a `dash_period` cookie, server reads it via `next/headers` `cookies()`. (2) Server-side session storage for the selected window.
**Why:** Payload 3 custom dashboard views receive `searchParams` from the URL query string as standard props. Using query params keeps the window shareable, bookmarkable, and reduces server state. The pure `resolvePeriod` helper in `lib/analytics/period.ts` has a sensible fallback (current month) on missing/invalid params, so the dashboard remains functional without any selector interaction.
**Trade-offs:** `?period=7d` in the URL means refreshing or sharing the admin URL carries the window. Peripheral but acceptable — clearing the param or omitting it falls back to the current month.
**Revisit if:** Payload changes how it passes `searchParams` to the admin dashboard component, or if cookie-based persistence becomes necessary for server actions / form submissions that lose query context.

---

## 2026-06-03 — Seller order notifications via Zalo OA
**Chosen:** Notify the seller through a Zalo Official Account message on order creation, triggered by a Payload `Orders.afterChange` hook (operation === 'create'). OA credentials live in an admin-managed `notification-settings` global; access tokens auto-refresh and the rotated refresh token is persisted back.
**Alternatives:** Zalo ZNS template messages (rejected: template approval + per-message cost, aimed at customers); calling the notifier directly from the checkout route (rejected: misses non-checkout order sources, couples checkout to notifications); a polling/queue worker (rejected: over-engineered for a single-seller ping).
**Why:** OA messages are free and adequate for notifying one internal recipient; the afterChange hook captures every order source and mirrors the existing inventory-sync hook; admin-managed config fits the template's "configure it to liking" goal. Notification is fire-and-forget so Zalo downtime never blocks an order.
**Trade-offs:** OA "consultation" message window can expire if the seller goes silent for a long time; the OA app secret/tokens are stored in plaintext in the admin global (admin-only access). Encrypting via the existing PAYMENT_SECRETS_KEY pattern is a noted follow-up.
**Revisit if:** the seller needs customer-facing notifications, multi-recipient/team alerts, or per-status (paid/shipped) notifications; or if plaintext secret storage becomes unacceptable.

---

## 2026-06-08 — CTR daily-rollup vs per-event storage
**Chosen:** Store impressions and clicks in a daily rollup table (`ProductCtrDaily` with `@@unique([productId, day])`), with capture endpoints upsert-and-increment counters. NOT per-event rows.
**Alternatives:** (1) Per-event rows following the existing `ProductViewEvent` / `AddToCartEvent` pattern. (2) Client-side aggregation with a single daily beacon per session.
**Why:** Impressions are far higher volume than page views — every product card in every grid on every listing page generates one. Per-event rows would bloat the table and slow range aggregation. A daily rollup keeps writes and queries cheap (one upsert per product per day, regardless of impression count). The min-impressions threshold (default 20) in `computeCtr()` further suppresses noisy ratios from tiny sample sizes.
**Trade-offs:** Loss of per-event granularity — cannot answer "how many cards were seen per session" or "what time of day do users browse." CTR is a summary metric; these questions would need a separate capture path.
**Revisit if:** Analysts need per-session impression counts or time-of-day breakdowns (add a sampled per-event table alongside the rollup).

---

## 2026-06-15 — Order management: derived stage + guarded actions (no schema migration)
**Chosen:** One pure `deriveOrderStage` + a guarded `availableActions`/`applyOrderAction` layer over the existing fulfillment functions; the `/admin/orders` dashboard is the single screen; raw collection status fields are read-only.
**Alternatives:** Single stored `status` enum (rejected: payment ⟂ fulfillment are orthogonal; big migration + PayOS webhook rewrite for little user gain); two-axis schema refactor (deferred: optional, not the source of owner pain).
**Why:** The unfriendliness was in the interface to the state (raw dropdowns, four vocabularies, invalid combos), not storage. Reusing `markOrderAsPaid`'s direct-SQL deadlock workaround avoids regressions.
**Trade-offs:** The orthogonal payment/fulfillment fields still exist in the DB; the single-stage invariant is enforced by the action layer + read-only UI, not the schema. Refund is record-only (no gateway refund call) in v1.
**Revisit if:** Partial refunds/fulfillment are needed, or an automated PayOS refund is required.

---

## 2026-06-23 — Rate limiting stays in-memory (single-instance) for now
**Chosen:** Keep `lib/rate-limit.ts` as a per-process in-memory `Map`. Auth/credential endpoints (`/api/auth/*`, `/api/register`) are covered by the `auth` preset in `middleware.ts`; behavior is pinned by tests in `lib/__tests__/rate-limit.test.ts`.
**Alternatives:** Upstash Redis or a Postgres-backed counter table for shared, durable limits across instances.
**Why:** Current deploy target is a single app instance (one VPS/container), where an in-memory map is correct and zero-dependency. A shared store adds an external dependency and latency for no benefit at one instance.
**Trade-offs:** On multiple instances or serverless fanout the effective limit multiplies by instance count and resets on cold start — i.e. the limit is unreliable when scaled horizontally. Documented in the file header.
**Revisit if:** The app is deployed to >1 instance or a serverless/edge platform — then move counters to Redis/Postgres before relying on the limit.

---

## 2026-06-29 — Default to inline work; subagents only when they save credits
**Chosen:** Work in main context by default. Reserve subagents for cases that genuinely save tokens/context — broad multi-file searches reducible to a compact summary, or genuinely independent parallel fan-out. Stay credit-frugal inline (targeted search, batched parallel tool calls, no re-reads) and autonomous for low-risk reversible work.
**Alternatives:** Keep the prior "always prefer subagents" default (rejected: each subagent re-establishes context and duplicates token usage, costly for the moderately-simple tasks it was being applied to).
**Why:** User decision — optimize for credit efficiency and autonomy. The blanket subagent-first rule spent tokens spinning up isolated contexts even for single-file edits and directed lookups that fit fine in main context.
**Trade-offs:** Large outputs handled inline can consume main context faster than offloading to a subagent; mitigated by the "spawn only when reducible to a summary" rule. Less parallelism on borderline-independent tasks.
**Revisit if:** Main context routinely fills on routine tasks, or parallel throughput becomes the bottleneck — then loosen the subagent threshold.

---

## 2026-06-29 — Animation System: Motion One via `motion` v12, with legacy preset aliases
**Chosen:** Build the scroll-reveal animation layer (Phase 01 of the animation spec) on the `motion` package (v12.42.0), using its imperative WAAPI API (`animate`, `stagger`, `inView`). Renamed presets per spec (fade-up/fade-in/slide-right/scale-in/stagger-cards/stagger-list/hero-entrance) but added backward-compat aliases mapping the pre-existing stored CMS values (`reveal-up`→`fade-up`, `reveal-right`→`slide-right`) so no data migration is needed. `scrollAnimation` field default flipped `none`→`default`; CMS field expanded 4→9 options. Field lives in `src/payload/blocks/_appearance.ts` (spread into all 30 blocks).
**Alternatives:** (a) Framer Motion — heavier (~50kb), React-coupled, rejected per spec. (b) Pure CSS classes (the prior `RevealOnScroll`) — no JS stagger / imperative micro-interaction control. (c) Hard rename presets with a data migration over stored CMS values — more risk, no upside vs aliasing.
**Why:** `motion` v12 unifies Motion One + Framer Motion; importing only the imperative WAAPI primitives keeps the ~18kb WAAPI footprint the spec wanted without React coupling. Aliasing is non-destructive and keeps already-published pages animating. prefers-reduced-motion enforced once in `config.ts` (`reduceMotion`) rather than per component.
**Trade-offs:** `motion` ships more than Motion One alone; tree-shaking must keep the bundle lean. Legacy aliases are permanent surface area until stored values are migrated. `defaultValue` change only affects new blocks (Payload semantics) — existing blocks keep stored values, which is the safe behaviour but means old pages won't pick up the new per-block-type defaults without an edit.
**Revisit if:** Bundle size regresses materially, or we decide to migrate stored `reveal-*` values and drop the aliases. Spec file references (`groups.ts`, `lib/page-builder-appearance.ts` for the field) were inaccurate — actual field is in `_appearance.ts`.

---

## 2026-06-29 — Animation Phase 3: "Checkout Step Progress" retargeted to order timeline
**Chosen:** Apply the spec §4 "Checkout Step Progress" micro-interaction (inactive→active scale+fill, active→complete SVG checkmark morph, sequential) to the order-status timeline at `profile/orders/[orderCode]` via a new `components/animations/OrderTimeline.tsx`, instead of the checkout flow.
**Alternatives:** (a) Refactor the single-page `checkout-form.tsx` into a multi-step wizard (contact→delivery→payment) and animate its progress bar. (b) Defer the task until a stepped checkout exists.
**Why:** The spec assumed a multi-step checkout wizard, but the checkout is a single-page form with stacked sections — there is no step navigation to animate. The order timeline (pending→paid→shipped→delivered) is the only genuine step-progress UI in the app, so it's the faithful home for this interaction. Building a wizard would mix a feature refactor into an animation phase (violates existing-code.md §3); deferring would drop a spec item. User decision after being presented all three options.
**Trade-offs:** The interaction now lives on order detail rather than checkout, so it's seen post-purchase, not during. If a stepped checkout is built later, the same OrderTimeline pattern can be reused there.
**Revisit if:** Checkout is reworked into a multi-step flow — wire the same animated step component into it.

---

## 2026-06-29 — Scroll-animation enum migration remaps legacy values to their alias targets
**Chosen:** In `20260629_152734_scroll_animation_presets`, before dropping `reveal-up`/`reveal-right` from the per-block `scroll_animation` enums, remap stored rows to the SAME targets the runtime alias layer uses — `reveal-up`→`fade-up`, `reveal-right`→`slide-right` (`lib/animations/config.ts` `LEGACY_ALIASES`). Both targets exist in the new enum, so no data is lost and the DB matches what the code would have rendered.
**Alternatives:** (1) The migration's original remap of both values to `scale-in` (justified as "the only preset in both enums" — incorrect; `fade-up`/`slide-right` are also in the new enum). (2) Keep the alias values in the enum and skip the remap entirely (rejected: the spec rename drops them from the enum, so stored rows must move or the `USING ::enum` cast fails).
**Why:** A `reveal-up` block renders as `fade-up` at runtime via the alias map; remapping the stored value to `scale-in` would silently change the animation and leave data inconsistent with code. Matching the alias targets makes the persisted value and the rendered animation agree, and is non-lossy.
**Trade-offs:** The dev DB was migrated once under the original `scale-in` remap before this fix (1 affected row, now `scale-in`); that original value is unrecoverable and would be re-picked in admin if it matters. `down()` remains lossy by design — it maps any value the old enum lacks back to `none`, since the new presets have no old-enum equivalent.
**Revisit if:** We migrate stored `reveal-*` values out entirely and drop the alias layer, or the alias targets in `lib/animations/config.ts` change (keep this remap in sync).

---

## 2026-06-30 — Retheme storefront to "Lô Hobby" monochrome + serif-logo system
**Chosen:** Replace the inconsistent theme layers (cool slicer-gray `--surface` tokens, warm/terracotta Tailwind scales, Fraunces serif display, and a contradictory DESIGN.md) with one unified monochrome system: white `--surface` / `#f5f5f5` raised / `#111` ink / neutral `--line`, no chromatic accent, Archivo display + Inter body + Playfair Display serif **logo only**. Default font preset changed `jakarta`→`inter`. Retuned the `warm`/`cream`/`terracotta` Tailwind scales in-place to a neutral monochrome ramp rather than renaming them, and rewrote DESIGN.md to match.
**Alternatives:** (1) Rename `warm-*`/`terracotta-*` to semantic neutral scales and rewrite every component reference — correct long-term but a large mechanical refactor mixed into a retheme. (2) Add a parallel set of neutral scales and migrate components gradually — leaves two palettes coexisting (existing-code.md §2 anti-pattern). (3) Drive everything off only `--surface/--ink/--line` semantic tokens — body/borders/focus rings reference `warm-*`/`terracotta-*` directly today, so this would still require touching every component.
**Why:** The body element and most chrome reference `bg-warm-50`, `text-warm-900`, `border-warm-200`, `ring-terracotta-400` directly — the semantic `--surface` tokens were secondary. Retuning the scale values flips the entire baseline to white/ink with zero component edits, keeping Phase 1 confined to the token layer (component rethemes are Phase 2). Keeping the scale names avoids a repo-wide rename churning the same diff as the retheme.
**Trade-offs:** The Tailwind scale names (`warm`, `terracotta`, `cream`) are now semantically misleading — a `terracotta-400` class renders neutral gray, not orange. This is documented in DESIGN.md and the config comments; a future cleanup can rename them in an isolated refactor. The brand-driven `filament`/`spool` scales are unchanged (already grayscale, runtime-overridable via `--brand-*`).
**Revisit if:** We do a dedicated refactor to rename the color scales to semantic names, or a store needs a genuinely chromatic brand accent (would reintroduce color into the `--brand-*` vars, not the neutral ramp).

---

## 2026-07-02 — YouTube channel block: live Data API v3 with manual fallback
**Chosen:** Fetch subscriber/view/video counts server-side via YouTube Data API v3 (`channels.list?part=snippet,statistics`), cached ~1h with `unstable_cache`. Editor-entered manual fields render when `YOUTUBE_API_KEY` is unset or the fetch fails.
**Alternatives:** Manual entry only (no key needed, static numbers); live-only with no fallback (block hides on failure).
**Why:** User decision. Live numbers keep the card honest without editor upkeep, while the manual fallback means the block still renders on dev/self-host setups that never configured a key, and survives quota exhaustion.
**Trade-offs:** Requires a Google Cloud key + enabling the Data API; counts lag up to an hour behind reality; the API has a daily quota (mitigated by the 1h cache tagged `youtube-channel`).
**Revisit if:** We need real-time counts, hit quota limits at scale, or want to support non-YouTube channel stats.

## 2026-07-02 — Reel carousel: poster + click-to-play modal (not inline embeds)
**Chosen:** Horizontal scroll track of poster tiles with prev/next arrows; clicking a tile opens a modal that loads the platform embed (YouTube `/embed`, TikTok `/embed/v2`, Facebook `plugins/video.php`). Embed URL conversion lives in the pure, unit-tested `lib/reel-embed.ts`.
**Alternatives:** Render each platform's live iframe embed inline in the track.
**Why:** User decision. Inline TikTok/Facebook embeds load heavy third-party player scripts up front and behave poorly inside a horizontal scroller; poster-first keeps initial load light and the track smooth, matching the existing Reels block pattern.
**Trade-offs:** One extra click to play; posters must be supplied by the editor (no auto-thumbnail from the platform).
**Revisit if:** We want autoplaying inline reels or auto-fetched thumbnails per platform.

---

## 2026-07-14 — Email verification: small testable lib modules, not inline logic
**Chosen:** Split the checkout-gate and Google-auto-verify logic into small, independently unit-testable modules (`lib/checkout-auth.ts`, `lib/auth-verify.ts`, `lib/email-verification.ts`, `lib/email/send.ts`) that the route/page/callback each call, rather than inlining the checks directly into `app/api/checkout/route.ts` and `auth.ts`.
**Alternatives:** Inline the `userId`/`emailVerified` check directly in `app/api/checkout/route.ts`'s `POST` handler and test it via a full-route test that mocks all ~20 of that file's existing dependencies (mirroring `app/api/checkout/demo/__tests__/confirm.test.ts`'s pattern).
**Why:** `app/api/checkout/route.ts` has no pre-existing test coverage and a large dependency surface (payment providers, dropshipping, coupons, gift cards, inventory, tax…); mocking all of it just to exercise a two-branch authorization gate is expensive to write and fragile to maintain. Extracting `requireVerifiedCheckoutUser`/`autoVerifyGoogleUser` as pure, prisma-only functions lets them be tested in isolation, while the route/callback integration is still covered by a narrow test that mocks only `@/auth` and `@/lib/prisma` (verified working — the gate runs before body parsing, so no other checkout dependency needs mocking for those tests).
**Trade-offs:** One more file per concern instead of inline code; the checkout route's authorization boundary now lives one hop away from the handler that enforces it.
**Revisit if:** The checkout route gets a full end-to-end test suite anyway, at which point the extraction stops paying for itself.

## 2026-07-14 — Checkout: buyer email now sourced only from the verified session
**Chosen:** With guest checkout removed, `buyerEmail` in `app/api/checkout/route.ts` is `session.user.email` only. The client-supplied `customerInfo.email` field (previously used as a guest fallback) is left in the request type/parser but no longer read for `buyerEmail`; `checkout-form.tsx`'s `requireEmail` prop and its guest email input become unreachable (still default to `false`/hidden) since the page never passes `requireEmail={true}` anymore.
**Alternatives:** Also strip `customerInfo.email` from the request type and delete the now-dead `requireEmail` branch in `components/checkout-form.tsx`.
**Why:** The email-verification spec only asks to remove the guest-checkout *fallback*, not to refactor `checkout-form.tsx`. Per `existing-code.md` §3 (refactoring and features are separate changes), the dead UI branch is left in place rather than pulled into this feature change.
**Trade-offs:** `components/checkout-form.tsx` carries an unreachable `requireEmail` code path until a follow-up cleanup removes it.
**Revisit if:** Someone picks up the flagged cleanup — remove `requireEmail`/the guest email field from `checkout-form.tsx` and `customerInfo.email` from the checkout API's request type, as a standalone refactor.

---

## 2026-07-15 — Media binaries stored in Postgres (bytea) instead of host filesystem
**Chosen:** Store media file bytes in the shared Postgres DB via a custom Payload storage adapter (`@payloadcms/plugin-cloud-storage` extension point) writing to a Prisma-managed `MediaFile` table; serve through the existing `app/media/[...path]/route.ts` with disk fallback. Spec: `docs/superpowers/specs/2026-07-15-db-media-storage-design.md`.
**Alternatives:** MinIO/S3-compatible object storage on the employer's 24/7 machine (`@payloadcms/storage-s3`); keeping filesystem storage and syncing `public/media` via git/rsync.
**Why:** The DB is the one piece of infrastructure already shared by all machines (employer's always-on Postgres), so putting bytes there makes images propagate automatically with zero new services. Dataset is small (715 files, 89 MB, max < 2 MB), well within comfortable bytea territory. Filesystem+sync fails the actual goal (admin uploads diverge); MinIO adds a service to install/secure/back up to solve an 89 MB problem.
**Trade-offs:** Cold image loads cross the network to the remote DB (mitigated by next/image caching + Cache-Control); `pg_dump` grows ~90 MB; unconventional pattern. Upload size capped at 25 MB in the adapter since the collection allows `video/*`.
**Revisit if:** Catalog media grows toward multi-GB, video uploads become a real use case, or origin image traffic becomes a bottleneck — then move to `@payloadcms/storage-s3` (adapter swap, same plugin architecture).

---

## 2026-07-15 — Gmail SMTP for outbound email
**Chosen:** Send all outbound email (verification, password reset, campaigns) via Gmail SMTP authenticated with a Google App Password, behind the existing `sendEmail()` / `sendBulkEmail()` interface.
**Alternatives:** Gmail API with OAuth2 (`gmail.send`); Resend's HTTP API (already coded but never activated).
**Why:** Email verification shipped 2026-07-14 but never delivered anything — `sendEmail()` gated on `RESEND_API_KEY` + `EMAIL_FROM`, which were set nowhere, so it logged and no-op'd. Resend needs a domain we own and can verify; without one it only delivers to the account holder's own address. The Gmail API was rejected despite being the user's initial ask: `gmail.send` is a restricted scope, so refresh tokens expire every 7 days while the consent screen is in Testing mode (silent weekly breakage), and leaving Testing requires Google verification and possibly a paid security assessment. It would also need a separate OAuth flow to mint a refresh token for the shop's own account, since the existing `AUTH_GOOGLE_*` credentials only authenticate customers. SMTP + App Password reaches the same outcome — Google sends the mail — with no scopes, no consent screen, and no expiring tokens.
**Trade-offs:** ~500 recipients/day on free Gmail (2,000 on Workspace), enough for verification but a real ceiling for campaigns. Sender is a gmail.com address, not the shop domain, which costs some deliverability and looks less professional. SMTP has no batch endpoint, so bulk sends are a sequential loop and slower than Resend's 100-per-request batching.
**Revisit if:** a shop domain is acquired (switch back to Resend for domain-backed sending and better deliverability), or campaign volume approaches the daily cap.

---

## 2026-07-15 — Checkout email-verification gate temporarily disabled via flag
**Chosen:** User decision: gate `requireVerifiedCheckoutUser`'s `emailVerified` check behind `REQUIRE_EMAIL_VERIFICATION` (`lib/feature-flags.ts`, default `true`), and set it to `false` in the current deploy config (`.env`, `docker-compose.yml`, `Dockerfile.private` — all gitignored).
**Alternatives:** Leave the gate enforced and block deploy until `APP_URL` is set; comment out the check directly instead of a flag.
**Why:** The app is about to be deployed but `APP_URL` still points at `localhost`. Verification emails sent in production would carry unusable localhost links, permanently locking every real customer out of checkout while the gate stays on. A flag (matching the existing `lib/feature-flags.ts` pattern) makes re-enabling a one-line env change instead of a code change once `APP_URL` is set to the real domain.
**Trade-offs:** Checkout accepts unverified accounts while the flag is off — no confirmed-email guarantee on early production orders.
**Revisit if:** `APP_URL` is set to the deployed domain — flip `REQUIRE_EMAIL_VERIFICATION` back to `true` (or unset it, since that's the default) in the deploy config.

---

## 2026-07-15 — Docker entrypoint answers `payload migrate` with "y", not "n"
**Chosen:** `yes | payload migrate` in `docker/entrypoint.sh`, plus a new `scripts/db-schema-ready.ts` guard that aborts the boot (exit 1) when Payload's tables are absent after the migrate step.
**Alternatives:** Keep `printf 'n\n'` and hand-run migrations after each deploy; `--force-accept-warning` (does not suppress the prompt); detect the `batch = -1` marker and choose the answer conditionally.
**Why:** The `n` answer was written to stop the prompt blocking forever on stdin in a non-interactive container, on the assumption that every migration file was already applied so declining was a no-op. That assumption does not hold on a fresh deploy DB. Declining makes Payload call `process.exit(0)` **without applying any migration**, exit code 0, no error — so the boot proceeds against a schema that was never created. Observed on the 116.118.6.30 deploy: Prisma migrated fine, `payload migrate` printed nothing, the seed guard reported `products table absent`, every seed failed on missing tables, and the storefront threw Postgres 42P01 on `payload.pages_blocks_hero_stats` at runtime. A silent skip is strictly worse than a loud failure: the symptom surfaces on a page far from the cause.
**Trade-offs:** On a DB carrying a `batch = -1` marker (from a previous `migrate:dev` / schema push), "y" accepts a reconcile Payload warns may lose data. Deliberate: this image only runs against deploy databases, where an unmigrated schema is the worse outcome. Take a dump before deploying onto a DB holding data you cannot lose. The schema guard adds one `pg` round-trip to every boot.
**Revisit if:** Payload gains a non-interactive migrate flag that applies pending migrations without prompting — switch to it and drop both the pipe and the guard.
