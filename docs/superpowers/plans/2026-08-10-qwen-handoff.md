# Qwen handoff — 3 batches

Prep once:
```bash
# 1. Raise the token cap in ~/.aider.model.settings.yml — batch C won't fit in 8192
#      extra_params:
#        max_tokens: 16384
# 2. Start the server
~/llama.cpp/run-qwen.sh
```

Everything Qwen needs already exists: `lib/admin-assistant/types.ts` (the `AdminTool`
interface), `lib/admin-assistant/tool-kit.ts` (`ok`/`fail`/`asStr`/`asInt`/`optInt`), and
`lib/admin-assistant/settings-schema.ts`. Each batch's tests are already written and failing.

Shared rules to paste at the end of every batch message:

> Rules: never import `@payload-config` — use `ctx.payload`. No character-class regex
> (square brackets) anywhere in `lib/` — it breaks the Tailwind build; use `.includes()` /
> `.startsWith()` / `.split()`. Payload relationship ids are numbers, never strings.
> Every tool exports a `const` matching the `AdminTool` type: `{ definition, run }`.
> Return `ok(...)` / `fail(...)` from tool-kit, never throw. Error messages in Vietnamese.

---

## Batch A — order and product read tools

```bash
cd ~/Ecommerce-Web
aider --edit-format whole --yes --auto-test \
  --test-cmd "node_modules/.bin/vitest run lib/__tests__/admin-assistant-order-tools.test.ts lib/__tests__/admin-assistant-product-tools.test.ts" \
  --read lib/admin-assistant/types.ts \
  --read lib/admin-assistant/tool-kit.ts \
  --read lib/__tests__/admin-assistant-order-tools.test.ts \
  --read lib/__tests__/admin-assistant-product-tools.test.ts \
  lib/admin-assistant/tools/find-orders.ts \
  lib/admin-assistant/tools/get-order.ts \
  lib/admin-assistant/tools/find-products.ts \
  lib/admin-assistant/tools/get-product.ts
```

Message:

> Write these four tools so the two read-only test files pass.
>
> `find_orders(status?, query?, limit?)` — `ctx.payload.find({collection:'orders', sort:'-createdAt', limit:100, pagination:false, depth:0})`, map each doc with `mapOrderToFulfillmentView` from `@/lib/order-fulfillment-view`, filter by status and by a lowercase match on customerName or orderCode, slice to limit (default 10, max 25). Return rows of `{docId, orderCode, customerName, totalAmount, paymentStatus, orderStatus, createdAt, availableActions}` where availableActions comes from `availableActions(view)` in `@/lib/order-transitions`. Do NOT include buyerEmail or phoneNumber.
>
> `get_order(orderCode?, docId?)` — same fetch and mapping; find the one matching doc; fail if neither identifier given or nothing matches. Return the whole view plus `availableActions`.
>
> `find_products(query, collection?, limit?)` — `collection` defaults to `products`, may also be `categories` (delegate to `searchCatalog(ctx.payload, 'categories', query, limit, ctx.locale)` from `@/lib/page-builder/assistant/resource-search`), anything else fails. For products: `ctx.payload.find({collection:'products', depth:0, limit, locale: ctx.locale, sort:'-createdAt', where: query ? {title:{like:query}} : undefined})` and return `{id, title, slug, price, stock, available, onSale, salePercent}`.
>
> `get_product(id)` — `ctx.payload.findByID({collection:'products', id, depth:1, locale: ctx.locale})`. depth 1 is required or the variants join returns bare ids. Return `{id, title, slug, price, stock, available, onSale, salePercent, categoryId, image, gallery, variants}` where categoryId and image are normalised to plain numbers (Payload returns either a number or a populated doc), gallery is the media id of each `gallery[].media`, and variants maps `variants.docs` to `{id, name, sku, stock}`.

---

## Batch B — media, navigation and settings read tools

```bash
cd ~/Ecommerce-Web
aider --edit-format whole --yes --auto-test \
  --test-cmd "node_modules/.bin/vitest run lib/__tests__/admin-assistant-nav-tools.test.ts lib/__tests__/admin-assistant-settings-tools.test.ts" \
  --read lib/admin-assistant/types.ts \
  --read lib/admin-assistant/tool-kit.ts \
  --read lib/admin-assistant/settings-schema.ts \
  --read lib/__tests__/admin-assistant-nav-tools.test.ts \
  --read lib/__tests__/admin-assistant-settings-tools.test.ts \
  --read lib/admin-assistant/tools/find-orders.ts \
  lib/admin-assistant/tools/search-media.ts \
  lib/admin-assistant/tools/open-admin-page.ts \
  lib/admin-assistant/tools/read-settings.ts \
  lib/admin-assistant/tools/describe-target.ts
```

Message:

> Write these four tools so the two read-only test files pass. `find-orders.ts` is included as a worked example of the shape.
>
> `search_media(query, limit?)` — thin wrapper over `searchMedia(ctx.payload, query, limit)` from `@/lib/page-builder/assistant/resource-search`. Default limit 10, max 25.
>
> `open_admin_page(target, id?)` — export `const ADMIN_PAGE_TARGETS: Record<string,string>` mapping a target name to an admin URL, and use `Object.keys(ADMIN_PAGE_TARGETS)` as the `target` enum in the tool definition so the two can never drift. Targets: store-settings→/admin/globals/store-settings, shipping→/admin/globals/shipping-settings, notifications→/admin/globals/notification-settings, auto-sale→/admin/globals/auto-sale-settings, header→/admin/globals/site-header, navigation→/admin/globals/navigation, dropship→/admin/globals/dropship-settings, orders→/admin/orders, order→/admin/collections/orders/{id}, products→/admin/collections/products, product→/admin/collections/products/{id}, media→/admin/collections/media, coupons→/admin/coupons, gift-cards→/admin/gift-cards, campaigns→/admin/campaigns, reviews→/admin/reviews, catalog-tools→/admin/catalog-tools, analytics→/admin/analytics, page-builder→/build. A template containing `{id}` requires the id argument and fails without it. On success return `ok('Link: ' + url, { kind: 'link', url, label })` with a Vietnamese label. No database access.
>
> `read_settings(global)` — reject anything not in `WRITABLE_GLOBALS`. `ctx.payload.findGlobal({slug, depth:0, locale: ctx.locale})`, then build `{path: value}` for every descriptor from `flattenGlobalFields(getGlobalFields(ctx.payload, slug))`, reading with `readByPath`, `null` when absent. Credential fields are already stripped by the flattener — do not add them back.
>
> `describe_target(kind)` — `kind` is `'product'` or one of `WRITABLE_GLOBALS`. For a global return `flattenGlobalFields(getGlobalFields(ctx.payload, kind))`. For `'product'` return a hardcoded spec array covering title, price, stock, available, onSale, salePercent and category, each with a type and a short note (price is VND integer ≥ 0, salePercent 0-100, category is a numeric id from find_products).

---

## Batch C — the four write tools

```bash
cd ~/Ecommerce-Web
aider --edit-format whole --yes --auto-test \
  --test-cmd "node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-order.test.ts lib/__tests__/admin-assistant-propose-product.test.ts lib/__tests__/admin-assistant-propose-settings.test.ts" \
  --read lib/admin-assistant/types.ts \
  --read lib/admin-assistant/tool-kit.ts \
  --read lib/admin-assistant/settings-schema.ts \
  --read lib/__tests__/admin-assistant-propose-order.test.ts \
  --read lib/__tests__/admin-assistant-propose-product.test.ts \
  --read lib/__tests__/admin-assistant-propose-settings.test.ts \
  --read lib/admin-assistant/tools/find-orders.ts \
  lib/admin-assistant/tools/propose-order-action.ts \
  lib/admin-assistant/tools/propose-product-update.ts \
  lib/admin-assistant/tools/propose-product-images.ts \
  lib/admin-assistant/tools/propose-settings-update.ts
```

Message:

> Write these four tools so the three read-only test files pass.
>
> CRITICAL: these tools must NOT write to the database. They validate and return a staged `Proposal` (see the `Proposal` type) via `ok('STAGED: ...', proposal)`. A human confirms it later; a different module performs the write. Never call `payload.update` or `payload.updateGlobal` here.
>
> `propose_order_action(docId, action, carrierKey?, trackingNumber?, customTrackingUrl?)` — fetch orders the same way find-orders does, map with `mapOrderToFulfillmentView`, find the matching docId. Reject unless `isOrderAction(action)` and the action is in `availableActions(view)` — the error must list what IS allowed. `ship` additionally requires carrierKey and trackingNumber, which go into `proposal.input`. Summary uses `ACTION_LABELS[action]` and the order code, all from `@/lib/order-transitions`.
>
> `propose_product_update(id, fields)` — accept only fields passing `isWritableProductField`; anything else fails naming the allowed list. Validate per field: title non-empty string, price number ≥ 0, stock integer ≥ 0, available/onSale boolean, salePercent integer 0-100, category integer (a string category id must fail — Payload rejects string relationship ids). Empty `fields` fails. Verify the product exists with `findByID` and use its title in the summary.
>
> `propose_product_images(id, image?, gallery?)` — at least one of image/gallery required. `gallery` must be an array of integers. Verify the product exists, then verify every media id exists via `ctx.payload.find({collection:'media', depth:0, where:{id:{in: ids}}})` and fail listing any that are missing.
>
> `propose_settings_update(global, fields)` — reject a global outside `WRITABLE_GLOBALS`. Build descriptors with `flattenGlobalFields(getGlobalFields(ctx.payload, global))` and reject any path not present, any path where `isRedactedPath` is true, and any value whose type does not match the descriptor (text/textarea/email/date→string, number→number, checkbox→boolean, select/radio→string that is one of `descriptor.options`).

---

## After all three batches

Tell Claude "batches done" — remaining work is the registry, both API routes, the chat panel
and the layout mount, plus a full-suite verification.
