# Ecommerce Web — Next.js + Prisma + payOS

A self-contained Next.js 15 storefront wired to **Prisma (PostgreSQL)** for product/order
persistence and **payOS** for VietQR payments. Drop-in compatible with the Vercel Commerce
template's data layer (`lib/shopify` swap point in `src/lib/db-adapter.ts`).

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
PAYOS_CLIENT_ID="..."
PAYOS_API_KEY="..."
PAYOS_CHECKSUM_KEY="..."
NEXT_PUBLIC_SITE_NAME="Local Store"
```

## 3. Migrate + seed the database

```bash
pnpm prisma:migrate    # creates Product / Order / OrderItem tables
pnpm db:seed           # loads 4 demo products
```

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
  schema.prisma                       — Product / Order / OrderItem + OrderStatus enum
src/lib/
  db-adapter.ts                       — Prisma client, UI type mapping, seed
lib/
  cart.ts                             — cookie-backed cart (server-only)
components/
  header.tsx                          — site header + cart button
  price.tsx                           — vi-VN currency formatter
  product-card.tsx                    — grid card
  add-to-cart.tsx                     — client button → server action
  cart/
    actions.ts                        — addItem / updateItem / removeItem / checkout
    cart-drawer.tsx                   — slide-out cart UI
app/
  layout.tsx, globals.css             — root layout + Tailwind
  page.tsx                            — product grid
  products/[handle]/page.tsx          — PDP
  checkout/page.tsx                   — server action trigger
  checkout/success/page.tsx           — verifies order via Prisma
  checkout/cancel/page.tsx            — marks PENDING → CANCELLED
  checkout/error/page.tsx             — payOS failure landing
  api/checkout/route.ts               — creates payOS payment request
  api/webhook/route.ts                — verifies + marks PAID
  api/orders/[orderCode]/route.ts     — status polling
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
  re-resolved from Prisma to prevent client-side tampering).
- Strict TypeScript, zero `any` values, `noUncheckedIndexedAccess: true`.
