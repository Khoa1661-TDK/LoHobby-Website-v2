# Commerce phases (ShopNex admin + Payload orders)

**Breaking change (2026-05):** Orders are stored in Payload `orders` (ShopNex-compatible). Legacy Prisma `Order` rows are no longer read by checkout, webhooks, or profile. Catalog, coupons, NextAuth, and VN payment gateways are unchanged.

## Admin (ShopNex UX)

| Area | Where |
|------|--------|
| Dashboard & analytics | `/admin` — `@shopnex/analytics-plugin` |
| Sidebar groups | `@shopnex/sidebar-plugin` + `src/payload/groups.ts` |
| Import / export | `@shopnex/import-export-plugin` on `products`, `orders` |
| Quick actions | `@shopnex/quick-actions-plugin` |
| SEO | `@payloadcms/plugin-seo` on products, categories, content-pages |

Legacy custom admin routes redirect:

- `/admin/orders` → `/admin/collections/orders`
- `/admin/analytics` → `/admin`
- `/admin/catalog-tools` → `/admin/collections/products`
- `/admin/hub` → `/admin`

## Phase 1 (complete)

- Variant stock validation + decrement on paid / committed orders
- Shipping & pickup (`shipping-settings` global)
- Coupons (Prisma `Coupon`)
- Store settings (`store-settings` global)

## Phase 2 (complete)

| Feature | Implementation | Flag |
|--------|----------------|------|
| Order analytics | ShopNex plugin on `/admin` | `ENABLE_ORDER_ANALYTICS` |
| Catalog CSV | ShopNex import/export + `/api/admin/catalog/*` | `ENABLE_CATALOG_IMPORT_EXPORT` |
| Persisted cart | `PersistedCart` + merge on login | `ENABLE_PERSISTED_CART` |

## Phase 3 (complete)

| Feature | Implementation | Flag |
|--------|----------------|------|
| Orders SoT | Payload `orders` + `carts` | — |
| Content pages | `content-pages` → `/pages/[slug]` | `ENABLE_CONTENT_PAGES` |
| Email campaigns | Prisma `EmailCampaign` + `/admin/campaigns` | `ENABLE_EMAIL_CAMPAIGNS` |
| Store customers | Payload `store-customers` ↔ Prisma user | `ENABLE_STORE_CUSTOMER_SYNC` |
| Dropshipping | `dropship-settings` + CJ stub | `ENABLE_DROPSHIPPING` |

`ENABLE_ORDER_SNAPSHOT_MIRROR` is deprecated (no `order-snapshots` collection).

## Setup after pull

```bash
pnpm prisma migrate deploy
pnpm payload:importmap
pnpm payload:types
pnpm payload:cleanup-order-snapshots
pnpm payload:db-push
```

On Windows PowerShell, set env vars with `$env:PAYLOAD_DB_PUSH = "true"` if needed; `payload:db-push` already enables push in the script. When prompted, choose **create table** (not rename from `order-snapshots`). If push fails on `order_snapshots` FK, run `payload:cleanup-order-snapshots` and push again.

## Environment flags

```env
ENABLE_ORDER_ANALYTICS=true
ENABLE_CATALOG_IMPORT_EXPORT=true
ENABLE_PERSISTED_CART=true
ENABLE_CONTENT_PAGES=true
ENABLE_EMAIL_CAMPAIGNS=true
ENABLE_STORE_CUSTOMER_SYNC=true
ENABLE_DROPSHIPPING=false
```
