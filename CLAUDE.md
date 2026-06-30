# [Project Name]

## What This Is
[This is a small shop website template with cms options which solved the problem of having to setup multiple shop, instead having one and config it to liking.]

## Tech Stack
| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | | |
| Frontend | | |
| Database | | |
| Infrastructure | | |

## Architecture
#Overview

A Next.js 15 ecommerce template with a dual-database architecture: Payload CMS (Postgres) for content/admin/orders/products and a Prisma (same Postgres) schema for coupons, gift cards, and campaign management. Authenticated via NextAuth.js with Google OAuth + JWT sessions. Backed by a PostgreSQL database with both Payload's managed schema and Prisma's schema coexisting.

The name "ShopNex" appears in plugins and package references — it's the underlying commerce engine/template this project is built on.

---

Tech Stack

Framework: Next.js 15 (App Router, --turbo dev)
CMS: Payload CMS 3.x (Postgres adapter, Lexical editor)
Database ORM: Prisma (coupons, gift cards, campaigns) + Payload native (content, orders, products)
Database: PostgreSQL
Auth: NextAuth.js v5 (Auth.js) with Google OAuth, JWT sessions
Styling: Tailwind CSS 4
UI Primitives: shadcn/ui (Radix-based)
Fonts: Google Fonts via next/font — Inter, Fraunces, Plus Jakarta Sans, Roboto
Payments: PayOS (Vietnamese payment gateway) + COD
Language: TypeScript (strict)
Package Manager: pnpm (workspace monorepo)
Testing: Vitest
Build: Webpack (via Payload plugin), Turbopack (dev)

---

Directory Structure

Ecommerce-Web/
├── app/
│   ├── (storefront)/       # Public-facing pages (route group)
│   │   ├── page.tsx        # Homepage
│   │   ├── layout.tsx      # Storefront / layout
│   │   ├── search/         # Product search & category listing
│   │   ├── products/[handle]/  # Product detail (legacy Shopify-like path)
│   │   ├── blog/           # Blog index + [slug] + category/[slug]
│   │   ├── checkout/       # Cart checkout
│   │   ├── profile/        # User profile (orders, addresses, wishlist)
│   │   ├── login/          # Auth page
│   │   ├── p/[slug]/       # Static pages
│   │   ├── pages/[slug]/   # Content pages
│   │   ├── about/          # About page
│   │   ├── contact/        # Contact form
│   │   ├── faq/            # FAQ page
│   │   └── ...             # Forgot/reset password, etc.
│   ├── (payload)/          # Admin route group
│   │   └── admin/          # Payload admin panel
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth API
│   │   ├── checkout/       # Checkout processing
│   │   ├── webhook/        # Payment webhooks
│   │   ├── wishlist/       # Wishlist CRUD
│   │   ├── recommendations/ # Product recommendations
│   │   ├── cross-sell/     # Cross-sell data
│   │   ├── orders/         # Order sync
│   │   ├── register/       # User registration
│   │   ├── search/         # Search API
│   │   └── admin-connect/  # Admin connectivity check
│   ├── media/              # Media file serving
│   ├── layout.tsx          # Pass-through root layout
│   └── globals.css         # Tailwind globals
├── components/
│   ├── layout/             # Navbar, footer, announcements
│   ├── blog/               # PostCard, blog components
│   ├── product/            # ProductCard, gallery, reviews, variant selector
│   ├── cart/               # Cart modal, add-to-cart, cross-sell
│   ├── wishlist/           # Wishlist provider & UI
│   ├── checkout/           # Checkout form
│   ├── home/               # Homepage sections (hero, categories, recs)
│   ├── blocks/             # CMS RenderBlocks (page builder)
│   ├── orders/             # Order history & views
│   ├── providers.tsx       # Client-side providers wrapper
│   └── ...                 # Analytics, theme toggle, cookie consent, etc.
├── lib/                    # Server/client logic
│   ├── payload-*.ts        # Payload data access layer
│   ├── shopify/            # Shopify API integration (storefront data)
│   ├── cart.ts             # Cart manipulation
│   ├── orders.ts           # Order processing
│   ├── payment-*.ts        # Payment gateway integration
│   ├── dropshipping/       # Dropshipping logic
│   ├── prisma.ts           # Prisma client singleton
│   ├── categories.ts       # Category helpers
│   ├── blog.ts             # Blog data access
│   ├── navigation.ts       # Navigation global resolver
│   ├── store-branding.ts   # Store settings resolver
│   └── ...                 # 70+ utility modules
├── src/
│   └── payload/
│       ├── collections/    # Payload collection schemas
│       │   ├── Products.ts
│       │   ├── Categories.ts
│       │   ├── Orders.ts
│       │   ├── Users.ts
│       │   ├── Media.ts
│       │   ├── Posts.ts
│       │   ├── BlogCategories.ts
│       │   ├── Carts.ts
│       │   ├── ContentPages.ts
│       │   ├── Pages.ts
│       │   ├── PaymentMethods.ts
│       │   ├── ProductVariants.ts
│       │   └── StoreCustomers.ts
│       ├── globals/         # Payload global configs
│       │   ├── SiteHeader.ts
│       │   ├── Navigation.ts
│       │   ├── StoreSettings.ts
│       │   ├── ShippingSettings.ts
│       │   └── DropshipSettings.ts
│       ├── plugins.ts       # Plugin configuration
│       └── groups.ts        # Field group definitions
├── prisma/
│   ├── schema.prisma        # Prisma schema (coupons, gift cards, campaigns)
│   └── migrations/          # Prisma migrations
├── scripts/                 # Seed, migration, utility scripts
├── auth.config.ts           # Edge-safe NextAuth config
├── auth.ts                  # NextAuth + Prisma adapter
├── middleware.ts            # Rate limiting middleware
├── payload.config.ts        # Payload CMS configuration
└── next.config.mjs          # Next.js config (Payload plugin, redirects)

---

Dual-Database Architecture

A distinguishing feature of this project is the coexistence of two ORM layers on the same PostgreSQL database:

1. Payload CMS (Managed Collections)
Payload CMS manages its own schema via Postgres adapter. Collections include:

* Products — full product data with variants, categories, SEO, snapshots
* Categories — hierarchical product categories
* Orders — complete order lifecycle
* Users — CMS admin users (separate from store customers)
* Customers — mapped from NextAuth users
* Media — image uploads with image cropping
* Carts — persisted cart data
* ContentPages / Pages — static/cms-managed pages
* Posts / BlogCategories — blog system
* PaymentMethods — available payment options

2. Prisma Schema
A separate Prisma schema on the same database handles:

* Coupons — discount codes (percent or fixed amount)
* Gift Cards — store credit system
* Campaigns — marketing campaigns (DRAFT/SCHEDULED/SENT/CANCELLED)

The Prisma client is generated to generated/prisma/, separate from Payload's schema.

---

Routing

Route Groups

* (storefront) — Public storefront. Has its own layout with fonts, navbar, footer, analytics, etc.
* (payload) — Admin panel layout

Key Storefront Routes
/ — Homepage with hero, categories, recommendations
/search — Product search with filters
/search/[collection] — Products in a category
/products/[handle] — Full product page with gallery, variants, reviews
/checkout — Multi-step checkout form
/blog — Blog index post listing with pagination
/blog/[slug] — Full post view
/blog/category/[slug] — Filtered posts
/p/[slug] — Basic CMS-managed static pages
/pages/[slug] — Rich content pages
/profile — User profile with orders, addresses, wishlist, account settings
/login — Auth page
/about, /contact, /faq — Static info pages

API Routes

* /api/auth/* — NextAuth authentication
* /api/checkout — Order creation
* /api/webhook — Payment webhook handler (PayOS)
* /api/register — User registration
* /api/wishlist — Wishlist CRUD
* /api/recommendations — Product recommendations
* /api/cross-sell — Cross-sell data
* /api/search — Product search
* /api/orders/* — Order management
* /media/* — Media file serving (handled by Payload)

---

Authentication Flow

1. NextAuth.js with Google OAuth provider
2. JWT-based sessions (no database sessions)
3. auth.config.ts is edge-safe (no Prisma/bcrypt imports), used in middleware
4. auth.ts extends with the Prisma adapter for database user persistence
5. Store customers sync with Payload's StoreCustomers collection
6. Rate limiting on auth routes via middleware (5/min per IP)
7. Custom login page at /login

---

Component Architecture

Client-Side Provider Hierarchy (components/providers.tsx)
SessionProvider (NextAuth)
└── StoreBrandingProvider
└── WishlistProvider
└── children

Key Components

* Navbar — Responsive nav with search, hover dropdowns, mobile menu, cart badge
* Footer — CMS-managed multi-column links from Navigation global
* ProductCard — Reusable product card across grids
* ProductGallery — Image gallery with zoom
* ReviewForm / Reviews — Product review system with star ratings
* VariantSelector — Product variant (size/color) picker
* CartModal — Slide-over cart with quantity controls
* AddToCart — Cart add button with variants
* CheckoutForm — Multi-step checkout (customer info → shipping → payment)
* RenderBlocks — CMS page builder block renderer

---

Data Flow Patterns

Storefront Data Access
Server components fetch data via functions in lib/ that wrap Payload's find/findByID:

1. lib/payload-products.ts — Product queries with caching (unstable_cache)
2. lib/categories.ts — Category tree building
3. lib/site-header.ts — Header nav with caching and revalidation
4. lib/navigation.ts — Footer/mobile menus with caching
5. lib/store-branding.ts — Store settings (name, logo, colors)
6. lib/cart.ts — Cart operations
7. lib/orders.ts — Order management
8. lib/blog.ts — Blog post queries

Caching Strategy

* Next.js unstable_cache with tag-based revalidation
* Cache tags: products, categories, header, navigation, store-settings
* afterChange hooks on Payload collections trigger revalidateTag()
* revalidate: false on cache config — manual revalidation only

Payment Flow

1. User adds items to cart (local state + Payload Carts collection)
2. Proceeds to checkout → order created in Payload Orders collection
3. Payment via PayOS (Vietnamese gateway) or COD
4. Webhook handler processes payment confirmation
5. Order status transitions: PENDING → PAID → SHIPPED → DELIVERED

---

CMS Admin

Collections (managed in Payload admin at /admin)
Products, Categories, Orders, Users, Media, Posts, BlogCategories, ContentPages, Pages, Carts, PaymentMethods, ProductVariants, StoreCustomers

Globals (single-instance configs)
SiteHeader (navigation tabs), Navigation (footer & mobile menus), StoreSettings (branding), ShippingSettings (rates), DropshipSettings (supplier config)

Plugins

* @payloadcms/plugin-seo — SEO meta generation per collection
* @shopnex/import-export-plugin — CSV import/export for products & orders

## Current Phase
Lô Hobby retheme (LOHOBBY phases 01–04) complete — monochrome editorial theme,
rethemed chrome, ProductShowcase + Reels blocks, and the assembled home seed are
all landed. No phase is currently active. See `.claude/phases/` — always check the
active phase file before starting work.

## Rules

### Always active
@rules/common/core.md
@rules/common/decisions.md
@rules/common/git.md
@rules/common/testing.md
@rules/common/debug.md
@rules/common/existing-code.md

### Production readiness (uncomment what applies)
<!-- @rules/common/security.md -->
<!-- @rules/common/deploy.md -->
<!-- @rules/common/observability.md -->
<!-- @rules/common/oss-hygiene.md -->

### UI projects only (remove if backend-only)
@rules/common/frontend.md

### Language rules (uncomment what applies)
<!-- @rules/go/go.md -->
<!-- @rules/swift/swift.md -->
<!-- @rules/typescript/typescript.md -->
<!-- @rules/kotlin/kotlin.md -->
<!-- @rules/flutter/flutter.md -->
<!-- @rules/rust/rust.md -->
<!-- @rules/dotnet/dotnet.md -->
<!-- @rules/python/python.md -->
<!-- @rules/spring/spring.md -->

## Project-Specific Constraints
<!-- Things Claude must not do in this project. Add as you discover them. -->

### Execution strategy — credit-efficient & autonomous (overrides default subagent preference)
Work directly in the main context by default. Subagents are no longer the primary
method — each one re-establishes context and duplicates token usage, so they are a
cost to justify, not a default. (User decision, 2026-06-29, supersedes the prior
2026-06-29 subagent-preference decision.)

**Default: act inline.** Read the specific files you need, make the change, verify it.
Do not spawn a subagent for single-file edits, directed lookups (a known file,
function, or symbol), or any task that fits comfortably in main context.

**Spawn a subagent only when it actually saves credits or context**, i.e. when ALL hold:
- The work would otherwise flood main context with output you won't need afterward
  (broad multi-file searches, reading many files to extract one conclusion), AND
- The result can be reduced to a compact summary, AND
- For parallel work: the subtasks are genuinely independent and run concurrently.
Use `subagent_type: "Explore"` for wide codebase searches; the general type for
isolated multi-file implementation; parallel Agent calls only for independent fan-out.
When unsure, do it inline.

**Be credit-frugal in main context too:**
- Prefer targeted search/grep and partial reads over reading whole trees.
- Batch independent tool calls into one message so they run in parallel.
- Don't re-read files already in context; don't re-derive established facts.
- Keep narration minimal — act, then report the outcome briefly.

**Be autonomous:** for low-risk, reversible work, decide and proceed without asking —
pick reasonable defaults for naming/formatting/equivalent approaches and note them
rather than pausing. This does NOT relax the existing gates: still stop and ask on the
core.md §3 approval triggers (scope/approach changes, destructive actions, "make it
work for now" simplifications) and the debug.md §1 two-attempt rule. Autonomy means
fewer trivial confirmations, not skipping the MUST-ask cases.

### Git workflow (overrides global git rules)
This is a personal/solo project. Commit directly to `main` and push to `origin/main` —
no feature branches or pull requests required. This overrides the team-branching and
PR requirements in `~/.claude/rules/common/git.md`. Still keep commits atomic and use
Conventional Commit messages. (User decision, 2026-06-22.)

## Context
<!-- Anything not obvious from the code: target platform, known constraints, current focus. -->
