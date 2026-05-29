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

Create a `.env` file with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/commerce?schema=public"
PAYLOAD_SECRET="..."                  # or AUTH_SECRET
AUTH_SECRET="..."                     # NextAuth
ADMIN_EMAILS="you@example.com"        # synced into Payload admin users
PAYOS_CLIENT_ID="..."                 # fallback when no CMS credentials are set
PAYOS_API_KEY="..."
PAYOS_CHECKSUM_KEY="..."
PAYMENT_SECRETS_KEY="..."             # base64, 32 bytes: openssl rand -base64 32
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Local Store"
```

Gateway API keys can also be entered per payment method in the Payload admin
(**Settings -> Payment methods**). They are encrypted with `PAYMENT_SECRETS_KEY`
before being stored and are never sent to the storefront. When a method has no
saved credentials, provider-specific environment variables are used as a
fallback (see `.env` examples below).

Supported automated gateways (configure in **Settings → Payment methods**):

| Provider | CMS credential fields | Webhook URL |
|----------|----------------------|-------------|
| payOS | Client ID, API Key, Checksum Key | `/api/webhook/payos` |
| MoMo | Partner Code, Access Key, Secret Key | `/api/webhook/momo` |
| ZaloPay | App ID, Key 1, Key 2 | `/api/webhook/zalopay` |
| VNPay | TMN Code, Hash Secret | `/api/webhook/vnpay` (GET) |
| ShopeePay | Partner Code, Partner Key, Merchant Ext ID | `/api/webhook/shopeepay` |
| Stripe | Secret Key, Webhook Secret | `/api/webhook/stripe` |

Optional env fallbacks (when CMS credentials are empty):

```env
# MoMo
MOMO_PARTNER_CODE="..."
MOMO_ACCESS_KEY="..."
MOMO_SECRET_KEY="..."

# ZaloPay
ZALOPAY_APP_ID="..."
ZALOPAY_KEY1="..."
ZALOPAY_KEY2="..."

# VNPay
VNPAY_TMN_CODE="..."
VNPAY_HASH_SECRET="..."

# ShopeePay
SHOPEEPAY_PARTNER_CODE="..."
SHOPEEPAY_PARTNER_KEY="..."
SHOPEEPAY_MERCHANT_EXT_ID="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
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

## 5. Webhooks (gateways)

Each gateway needs a public webhook/IPN URL. Register in the provider dashboard:

- payOS: `https://<domain>/api/webhook/payos` (legacy `/api/webhook` also works)
- MoMo: `https://<domain>/api/webhook/momo`
- ZaloPay: `https://<domain>/api/webhook/zalopay`
- VNPay: `https://<domain>/api/webhook/vnpay`
- ShopeePay: `https://<domain>/api/webhook/shopeepay`
- Stripe: `https://<domain>/api/webhook/stripe`

For local testing use
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
