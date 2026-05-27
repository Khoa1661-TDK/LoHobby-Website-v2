# Ecommerce Web — Next.js + Payload CMS + Prisma + payOS

A Next.js 15 storefront with **Payload CMS** as the product catalog (products, categories, media),
**Prisma (PostgreSQL)** for users/orders/auth, and **payOS** for VietQR payments.
The storefront reads catalog data via `lib/payload-products.ts` (wired through `lib/shopify`).

## Prerequisites

- Node.js **20+** (the bundled Cursor helper is not enough — install a real Node)
- pnpm (recommended) or npm
- PostgreSQL 14+ running locally, or a Neon / Supabase URL
- payOS account with **Client ID**, **API Key**, **Checksum Key**

## 1. Install

```bash
pnpm install        # or: npm install
```

## 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/commerce?schema=public"
PAYLOAD_SECRET="..."                  # or AUTH_SECRET
AUTH_SECRET="..."                     # NextAuth
ADMIN_EMAILS="you@example.com"        # synced into Payload admin users
PAYOS_CLIENT_ID="..."
PAYOS_API_KEY="..."
PAYOS_CHECKSUM_KEY="..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Local Store"
```

## 3. Migrate the database

```bash
pnpm prisma db push       # User / Order / OrderItem tables (no Product table)
pnpm db:seed              # optional — prints catalog seeding instructions
```

Add products, categories, and media in **Payload admin** at `/admin/collections/products`.
Sign in with an email listed in `ADMIN_EMAILS` (via `/login`), then visit `/admin`.
The app will auto-connect your Payload session via `/api/admin-connect`.

## 4. Run

```bash
pnpm dev
```

Open <http://localhost:3000>.

## 5. Webhook (payOS)

payOS needs a public URL to deliver settlement events. For local testing use
[ngrok](https://ngrok.com/) or [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
ngrok http 3000
```

Then in the payOS dashboard register:

```
https://<your-tunnel>.ngrok-free.app/api/webhook
```

The endpoint verifies signatures with `payOS.webhooks.verify(body)` and atomically marks the
matching order `PAID`.

## File map

```
prisma/
  schema.prisma                       — User / Order / OrderItem + OrderStatus enum
src/payload/collections/              — Products, Categories, Media, Users
lib/
  payload-products.ts                 — storefront catalog queries (Payload)
  shopify/index.ts                    — commerce API surface (delegates catalog to Payload)
  cart.ts                             — cookie-backed cart (server-only)
src/lib/
  db-adapter.ts                       — Prisma client re-export (orders & auth)
```

## Data flow

1. User clicks **Add to cart** → `addItemAction` → cookie cart.
2. User clicks **Proceed to payOS checkout** → `checkoutAction` →
   `POST /api/checkout` → `payOS.paymentRequests.create()` → redirect to `checkoutUrl`.
3. User pays the VietQR.
4. payOS calls `POST /api/webhook` → `payOS.webhooks.verify(body)` →
   `prisma.order.updateMany({ status: 'PAID' })`.
5. User is returned to `/checkout/success?orderCode=...` which reads the order from Postgres.

## Notes

- All prices are **integer VND** end-to-end (payOS requirement); no floating point.
- `orderCode` is a generated 12-digit integer, unique per order.
- The webhook route also responds to `GET` so the payOS dashboard "Test webhook" probe passes.
- The cart is server-side only (cookie holds `productId`/`quantity` pairs; prices are always
  re-resolved from Payload to prevent client-side tampering).
- Strict TypeScript, zero `any` values, `noUncheckedIndexedAccess: true`.
