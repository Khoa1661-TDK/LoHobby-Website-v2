# Claude Design prompt — ShopNex custom admin

> Paste everything below the line into Claude Design. It asks for a multi-artboard
> canvas covering every admin surface this project has today, plus the new Shopee
> crawler. Designed to be re-implemented as custom Next.js code, with Payload kept
> as a headless data layer.

---

Design a complete admin console for **ShopNex**, a Vietnamese e-commerce store
(3D-printing / hobby maker shop, brand "Lô Hobby"). Produce one pan-and-zoom canvas
with a separate artboard per screen listed below, at 1440×900 desktop unless noted.

## Context you need

The store runs on Next.js 15 + Payload CMS on Postgres. **Payload's own admin UI is
being abandoned** — it stays as the database, API and business-logic layer, but every
screen below gets rebuilt as custom code. So do not design anything that looks like a
generic CMS: no "collection list → record form" shape unless that genuinely is the
best fit for the job. Design each screen around the *task*, the way a purpose-built
tool would.

Two screens already exist in this style and set the precedent — a page builder with
live preview, and a visual editor for site header/footer/logo. Match that spirit.

Currency is **VND** — integer amounts, no decimals, thousands separators (e.g.
`450.000 ₫`). The UI must support **Vietnamese and English** locales; Vietnamese
strings run roughly 15–25% longer than English, so no layouts that break on longer
labels. Support light and dark themes.

## Visual direction

Dense, calm, operator-grade. This is a tool someone uses for hours, not a marketing
dashboard — favour information density and fast scanning over generous whitespace and
decorative cards. Neutral monochrome base with a single accent used only for primary
actions and live/running state. Tabular numbers for every money and quantity column.
Do not use the default shadcn/Tailwind look straight out of the box; give it a
specific, considered identity.

## Screens to design

### 1. App shell & navigation
The frame every screen sits in. Needs to hold ~20 destinations without becoming a
wall of links — group them (Catalogue, Orders, Customers, Content, Marketing,
Settings). Include global search, locale switch, theme toggle, and an entry point for
the AI assistant panel (see 16). Show the collapsed and expanded states.

### 2. Dashboard
Revenue and traffic at a glance, built from real event data the app already collects:
visit sessions, product view events, add-to-cart events, purchase events, and a daily
product click-through-rate rollup. Show revenue over time, conversion funnel
(view → cart → purchase), top products by CTR, and recent orders. VND throughout.

### 3. Shopee crawler — job launcher  ★ new feature
The headline new screen. An operator pastes a **Shopee shop URL** and starts a crawl
that runs on a worker machine elsewhere (their desktop, which holds the login cookies
and a real browser). Design:
- the URL input and start action, with options for scope (whole shop / limit N)
- **worker status** — this is critical: the worker is often offline, and the UI must
  make "your desktop isn't running, the job is queued" obvious and non-alarming
- history of previous crawls for that shop

### 4. Shopee crawler — live job progress
A long-running job (100+ products, minutes to hours). Show per-product progress
against a known total, current stage (listing → product page → images → video), a
running log, counts of found / no-video / errored, and pause/cancel. It must survive
a page reload and read clearly when it has been running unattended for an hour.

### 5. Shopee crawler — review & publish queue  ★ the important one
Crawled products land in a staging queue, never straight into the live store. The
operator reviews many products fast. Each crawled product carries: title, description,
price, stock, a set of images, an optional product video, and variant options (e.g.
"Màu" with several choices, each with its own price and stock).

Design for **bulk throughput** — approving 100 products one modal at a time is the
failure this whole screen exists to prevent. Include:
- a grid/table of crawled products with image thumbnail, title, price, variant count,
  video present/absent, and a per-row approve/reject
- multi-select with bulk approve, bulk category assign, bulk price adjust
- a detail view for one product: image gallery with reorder + per-image drop, video
  preview, editable title/price/stock, variant table
- **re-crawl diffing** — when a shop is crawled again, existing products must show
  what changed (price up/down, new images, gone out of stock) rather than duplicating.
  Show this diff state clearly.
- assigning each product to a store category before publish

### 6. Products — list
Hundreds of products, worked on in bulk. Columns: image, title, category, price, sale
state, stock, published state. Needs fast filter/sort, inline edit of price and stock,
multi-select bulk actions (publish, category, price change, put on sale), and a clear
indicator for products managed by the automatic-sale system (see 14) so a manual edit
doesn't silently get overwritten.

### 7. Product — editor
One product, shaped like a product rather than a form. Fields that exist: title, slug,
category, description (rich text), price, on-sale toggle + sale percent, availability,
stock, a main image, an image gallery, and SEO meta (title, description, share image).
Two flags are system-managed and must be visible but distinct: `autoSaleManaged` and
`autoSaleReleasedAt`. Show the image gallery as a real gallery — drag to reorder,
set the main image, drop new files.

### 8. Product variants
Variants are separate records linked to a product: name, SKU, optional price override,
stock, and an image. Design this as a **table inside the product editor**, not a
separate destination — editing 6 variants should never mean 6 page loads.

### 9. Orders — list
Columns: order id, customer, total (VND), payment status, order status, date. Two
independent status axes that must both be scannable:
- payment: pending / paid / failed / refunded
- order: pending / processing / shipped / delivered / canceled
Filter by either. Highlight orders needing action (paid but not shipped).

### 10. Order — detail
A fulfilment workspace. Contains: line items with images, subtotal, shipping, discount,
tax, gift-card amount and total; applied coupon and gift-card codes; customer name,
email, phone; delivery method; payment method and kind; a timeline of paidAt /
confirmedAt / shippedAt / deliveredAt; cancellation reason and note when canceled; and
a flag for whether inventory was already adjusted. The primary actions are advancing
status and recording shipment — those should be the most prominent thing on the page,
not buried under fields.

### 11. Media library
All media binaries live **in the database**, and the library holds both images and
**product videos**. Design a grid with type filter, search, file size, and where each
file is used. Video items need a player with scrubbing. Include an upload drop zone
and a bulk-delete flow that warns when a file is referenced by a product.

### 12. Categories
A hierarchical product category tree — drag to reorder and re-parent, with product
counts per node.

### 13. Content — pages, blog posts, blog categories, redirects
Page list linking out to the existing visual page builder. Blog post editor with rich
text, cover image, category and SEO. A simple redirects manager (from → to).

### 14. Marketing — coupons, gift cards, campaigns, auto-sale
Four related surfaces:
- **Coupons**: code, percent or fixed VND amount, validity, usage
- **Gift cards**: code, balance, issue and redemption history
- **Email campaigns**: draft / scheduled / sent / cancelled, with a send action
- **Auto-sale settings**: a nightly job that puts the most-viewed products on sale
  automatically. Show the rules and which products it currently controls.

### 15. Customers & engagement
Customer list with order history and addresses. Plus the inbound queues that currently
have no home: product reviews awaiting moderation, wishlist data, newsletter
subscribers, and contact-form messages.

### 16. AI assistant panel
An existing feature to redesign. A chat panel, openable over any screen, driven by a
local LLM. Its defining constraint: **the assistant never writes directly.** It
*proposes* a change — a product update, an order action, a settings change, product
images — and the operator sees the proposed change and explicitly confirms before it
is applied. Design the proposal card: what is changing, from what to what, confirm and
discard. This confirm step is the whole safety model, so it must be impossible to
click through by accident.

### 17. Settings
Store settings (name, branding, logo, colours), shipping rates, notification settings,
payment methods, and dropshipping supplier config. Also a CSV import/export screen for
products and orders. Group these so the frequently-touched ones aren't buried with the
ones touched twice a year.

### 18. Mobile — orders only
One 390×844 artboard: checking and advancing orders from a phone. Nothing else on this
console needs to be mobile, but this does.

## Deliverable

Lay the artboards out in labelled groups matching the sections above. Include a small
style-tile artboard showing the colour tokens, type scale, and the core components
(button variants, input, table row, status pill, empty state, the "worker offline"
state) so the whole set can be rebuilt consistently in code.
