# Page Builder Product Picker — Design

Date: 2026-06-21
Status: Approved (design)

## Problem

The custom visual page builder panel (`FieldRenderer.tsx`) cannot edit
`relationship` fields. `describeField` in `lib/page-builder/block-schemas.ts`
only emits `relationTo` for `upload` fields, and `FieldRenderer` only renders
`text`, `textarea`, `select`, `upload`, and `array`. Any other field type — most
importantly `relationship` and `number` — hits the fallback and renders the grey
placeholder *"… field — editable in a later phase."*

Consequences for the product blocks:

| Block | Item field | Status in builder |
|-------|-----------|-------------------|
| Featured Products ("New drops") | `products` — relationship → products, hasMany, maxRows 12 | placeholder, not editable |
| Featured Collection | `collection` — relationship → categories, single | placeholder, not editable |
| Recommended for you | none (`title` + `limit` only) | renders placeholder text, shows no products |
| Recently viewed | none (`title` + `limit` only) | renders placeholder text, shows no products |

So there is **no way to manually add products/categories to a page** in the
builder. Featured Products and Featured Collection have the right schema but no
editor; Recommended/Recently-viewed have neither an editor nor any real product
output (their render components only print placeholder text such as
*"Personalized recommendations for 8 items (client-side)"*).

## Goals

1. Add a relationship picker to the builder panel so blocks with `relationship`
   fields are editable.
2. Make Featured Products and Featured Collection curatable in the builder with
   no schema change (the picker lights them up).
3. Give Recommended-for-you and Recently-viewed an **optional** pinned-products
   override: when products are picked, the block renders them; when empty, the
   block keeps its current (auto/placeholder) behavior.
4. Render a number input for `number` fields (e.g. `limit`), removing the last
   in-use placeholder type while we are in `FieldRenderer`.

## Non-Goals

- Building a real recommendation/recently-viewed personalization engine. Those
  remain placeholders in auto-mode; this work only adds the manual override.
- Changing the storefront render path, the iframe preview postMessage protocol,
  or autosave/persistence mechanics.
- Editing `richText` fields (still a later phase).
- Changing Featured Products / Featured Collection block schemas.

## Approach

### 1. RelationshipPicker — new client component

`components/page-builder/RelationshipPicker.tsx`, modeled on the existing
`MediaPicker`:

- Props: `relationTo: 'products' | 'categories'`, `hasMany: boolean`,
  `value: (string | number)[] | string | number | null`,
  `onChange(value)`, `onClose()`.
- Modal with a search box that queries Payload REST:
  `/api/{relationTo}?where[title][like]=<q>&limit=20&depth=0`, sent with
  `credentials: 'same-origin'` (admin session), exactly like `MediaPicker`'s
  `/api/media` call. Both `products` and `categories` are `payloadPublicReadAdminWrite`,
  so read is allowed.
- Clicking a result adds it. For `hasMany`, selected items render as **reorderable
  chips** (order = display order) with remove buttons. For single (`collection`),
  selecting replaces the value.
- Current value IDs are resolved to display labels via
  `/api/{relationTo}?where[id][in]=…&depth=0`.
- Stores **IDs only**. The Pages `layout` is a real Payload blocks field, so
  Payload populates the IDs to full docs (with `slug`, price, image) at `depth:2`
  on read — which is what the render components already expect.

### 2. Schema descriptor — `lib/page-builder/block-schemas.ts`

- Extend `FieldDescriptor` with `hasMany?: boolean`.
- In `describeField`, handle `field.type === 'relationship'`: emit `relationTo`
  (currently only set for `upload`) and `hasMany`.

### 3. FieldRenderer — `components/page-builder/FieldRenderer.tsx`

- Add `case 'relationship'`: render selected items + an "Add product/collection"
  button that opens `RelationshipPicker`; write back an ID array (hasMany) or a
  single ID.
- Add `case 'number'`: render a number `<input>` bound to the value (removes the
  `limit` placeholder).

### 4. Block schema + render changes

- **Featured Products / Featured Collection:** no schema change. They already
  carry the relationship field and become editable once the picker exists.
  - Featured Collection stores the category **ID**; at render the page is fetched
    at `depth:2`, so `collection` arrives as a populated doc and
    `getCollectionProducts(collection.slug)` resolves as today.
- **Recommended for you / Recently viewed:** add an optional `products`
  relationship field (`relationTo: 'products'`, `hasMany: true`, `maxRows: 12`,
  label e.g. "Pinned products — overrides auto"). Update the render components:
  if `products` is non-empty, resolve via `getPayloadProductsByIds` and render the
  `ProductCard` grid (same pattern as `FeaturedProducts`); if empty, keep current
  behavior.
- **Default block** (`lib/page-builder/default-block.ts`): ensure the new
  `products` field defaults to an empty array so new blocks are valid.

### 5. Migration

Adding `products` to the Recommendations and RecentlyViewed blocks changes the
Payload schema. Generate a Payload migration as part of this work — otherwise the
storefront throws `42P01` (relation does not exist) at runtime. Known gotcha in
this repo.

## Error Handling

- Picker fetch failures: show an empty result list and a non-blocking message,
  matching `MediaPicker`'s catch-to-empty behavior. Never throw from the picker.
- Invalid/stale IDs in a saved layout: render components already filter falsy IDs
  and `getPayloadProductsByIds` returns only resolvable docs; a removed product
  simply drops out of the grid.
- Empty selection on Featured Products/Collection keeps the existing
  "No products/collection selected — configure this block" message.

## Testing

- Unit: `describeField` emits `relationTo` + `hasMany` for a `relationship` field.
- Unit: Recommendations / RecentlyViewed render the picked `ProductCard` grid when
  `products` is set, and fall back to current behavior when empty.
- Component: `FieldRenderer` renders the picker for a relationship field and calls
  `onChange` with an ID array when an item is selected (mocked `fetch`).

## Risks / Decisions

- **Pinning on "Recommended for you" / "Recently viewed"** removes personalization
  for that block. Mitigated by the optional-override model: auto remains the
  default; pinning is opt-in. Flagged to and accepted by the user.
- **`limit` semantics:** in auto-mode `limit` caps the list; when products are
  pinned, the pinned list defines what shows (limit ignored). Made explicit in the
  field labels/help.
- **Persistence:** assumes builder autosave writes the `layout` through Payload so
  relationship IDs persist as real relationships. To be confirmed during
  implementation against `use-autosave` / the build save path.
