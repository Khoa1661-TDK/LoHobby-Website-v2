# Implementation task (from the console data layer plan)

Repo: /home/khoa1661/Ecommerce-Web — Next.js 15 App Router + Payload CMS 3 + Prisma, TypeScript strict.
Implement ONLY the task below. Do not commit. Report which files you changed.

## Global Constraints

Every task's requirements implicitly include this section.

1. **No character-class regex anywhere under `lib/`.** Tailwind scans `lib/`; a regex containing `[` `]` there has previously destroyed the entire stylesheet and 500'd every page. Use `Intl.NumberFormat` / `Intl.DateTimeFormat` and string methods only.
2. **No file under `src/payload/collections/` or `src/payload/globals/` may import from `lib/console/`.** `lib/console/*` top-level imports `@payload-config`; a collection importing it TDZ-crashes every Payload route with "Cannot access 'j' before initialization".
3. **Payload `join` fields return bare ids at `depth: 0`.** Any query that reads `product.variants.docs[].stock` must pass `depth: 1`.
4. **Payload relationship ids are numeric** (`defaultIDType = number`). Never write a `String()` id back to Payload. Reading is fine; console row `id` fields are strings, so `String(doc.id)` on the *way out* is correct.
5. **Test files must `import { describe, it, expect } from 'vitest'`.** `globals: true` is runtime-only; `tsc --noEmit` fails without the import.
6. **Tests live in `lib/__tests__/*.test.ts`.** A test outside the configured globs is silently skipped.
7. **Do not run `pnpm <script>`** — a `runDepsStatusCheck` wrapper fails. Call binaries directly: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`.
8. **Component JSX text is frozen.** Every Vietnamese string, class name, `var(--adm-*)` token and element in `components/console/**` was verified against a design artboard at 96–100% fidelity. A task may add a props parameter and swap a module-const identifier for a prop. A task may **not** reword copy, change a class, or restructure markup. `git diff` on a component must show only the data-source change (plus the two documented wireframe exceptions in Tasks 6 and 7).
9. **No new Payload collection, field, or global, and no migration.** A new Payload field without a generated migration throws `42P01` at runtime here.
10. **No caching.** Console readers hit the database on every request; `app/(console)/admin/layout.tsx` already sets `dynamic = 'force-dynamic'`.
11. **Reads only.** No task adds a write, mutation, or server action. The tab strips, filter bars and pagination controls stay inert.
12. **The three crawler screens are untouched** (`app/(console)/admin/console/crawl/**`, `components/console/crawl/**`, `components/console/queue/**`). They keep their fixtures.
13. Every file this plan creates starts with a `// path/to/file.ts` comment line followed by a short purpose note, matching the existing console files.
14. **`lib/__tests__/vitest-setup.ts` mocks `@/lib/prisma-client`.** `lib/prisma-client.ts` builds the client at module scope and throws when `DATABASE_URL` is unset, so without the mock a test could not even import a Prisma-backed adapter. Consequence: only the **pure mappers** are unit-testable. Never write a unit test that calls an async reader.
15. **Prisma import paths are fixed:** the client is `import prisma from '@/lib/prisma'` (default export, carries the `server-only` guard); model types are `import type { Coupon } from '@/generated/prisma/client'`; enums are `import { CampaignStatus } from '@/generated/prisma/enums'`. Never import `@/lib/prisma-client` directly.

### Vocabulary the mappers must translate

| Source | Console |
|---|---|
| Payload `orderStatus: 'canceled'` (one L) | `OrderStatus: 'cancelled'` (two L) |
| Payload `Order.orderId` (numeric string, e.g. `'2031'`) | `'#DH-2031'` |
| Prisma `CampaignStatus.CANCELLED` | `CampaignStatus: 'cancelled'` (added in Task 11) |
| VND integer `450000` | `'450.000 ₫'` (U+20AB, **not** the `'450.000 VND'` that `lib/analytics/currency.ts` `formatVnd` returns) |
| ISO timestamp | `'20/08'` in lists, `'20/08/2026, 09:14'` in the order detail header |

Minus signs in discount copy are U+2212 `−`, not the ASCII hyphen — matching the existing fixtures (`'−15%'`, `'−45.000 ₫'`).

---

## Existing reference code — read these before writing
- `lib/console/orders.ts` — the pattern for a Payload-collection area (pure mapper + thin readers).
- `lib/console/reviews.ts` — the pattern for a Prisma-backed area.
- `lib/console/settings.ts` — the pattern for a Payload-global area.
- `lib/console/format.ts` — exports `formatVndSymbol`, `formatOrderCode`, `formatDayMonth`, `formatDateTime`, `formatPercent`, `formatCount`. Import from `./format`.

---

### Task 7: Media adapter — DELEGATED

**Files:**
- Create: `lib/console/media.ts`
- Test: `lib/__tests__/console-media.test.ts`
- Modify: `components/console/media/MediaGrid.tsx`
- Modify: `app/(console)/admin/console/media/page.tsx`

**Design deviation, deliberate.** `MediaItem` currently has only `{ id, kind }` and the grid draws flat grey squares — the artboard's stand-in for thumbnails. This task adds `url` and `alt` and renders the real image. The 6-column grid, the `aspect-square`, the gap, the `--adm-placeholder` background (now the backdrop behind a loading image) and the video play glyph are all unchanged. The play glyph now sits **over** the thumbnail rather than on an empty square.

**Interfaces:**
- Consumes: `getPayload({ config })` on the `media` collection.
- Produces:
  - `type MediaItem = { id: string; kind: 'image' | 'video'; url: string | null; alt: string }` — stays exported from `components/console/media/MediaGrid.tsx`; the adapter imports it type-only.
  - `toMediaItem(doc: Media): MediaItem`
  - `listMediaItems(limit?: number): Promise<MediaItem[]>`

**Key facts:**
- `import type { Media } from '@/src/payload/payload-types'`. Fields: `id: number`, `alt: string`, `url?: string | null`, `thumbnailURL?: string | null`, `mimeType?: string | null`, `filename?: string | null`.
- `kind` is `'video'` when `mimeType` starts with `'video/'`, else `'image'`. Use `String(doc.mimeType ?? '').startsWith('video/')` — **no regex**.
- Prefer `thumbnailURL` over `url` when present; `null` when neither exists.
- Sort `-createdAt`, default `limit` 60.
- Render with a plain `<img>` and an `// eslint-disable-next-line @next/next/no-img-element` comment. Do **not** use `next/image`: Payload media URLs follow the request host, and an http LAN-IP source 400s through the image optimizer unless `remotePatterns` covers it. A plain `<img>` sidesteps that entirely and this is an admin grid, not a storefront page.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-media.test.ts`:

```ts
// lib/__tests__/console-media.test.ts
import { describe, it, expect } from 'vitest';
import type { Media } from '@/src/payload/payload-types';
import { toMediaItem } from '@/lib/console/media';

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 5,
    alt: 'Móc khóa Totem',
    url: '/media/totem.png',
    mimeType: 'image/png',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Media;
}

describe('toMediaItem', () => {
  it('should map an image upload to an image item', () => {
    expect(toMediaItem(makeMedia())).toEqual({
      id: '5',
      kind: 'image',
      url: '/media/totem.png',
      alt: 'Móc khóa Totem',
    });
  });

  it('should classify a video mime type as a video item', () => {
    expect(toMediaItem(makeMedia({ mimeType: 'video/mp4' })).kind).toBe('video');
  });

  it('should prefer the generated thumbnail over the full-size url', () => {
    const item = toMediaItem(makeMedia({ thumbnailURL: '/media/totem-300.png' }));
    expect(item.url).toBe('/media/totem-300.png');
  });

  it('should return a null url when the upload has neither url nor thumbnail', () => {
    expect(toMediaItem(makeMedia({ url: null, thumbnailURL: null })).url).toBeNull();
  });

  it('should fall back to the filename for alt text when alt is empty', () => {
    const item = toMediaItem(makeMedia({ alt: '', filename: 'totem.png' }));
    expect(item.alt).toBe('totem.png');
  });

  it('should classify a missing mime type as an image', () => {
    expect(toMediaItem(makeMedia({ mimeType: null })).kind).toBe('image');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-media.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Extend `MediaItem` and render the thumbnail**

In `components/console/media/MediaGrid.tsx`, extend the interface, delete `MEDIA_ITEMS`, and change only the inside of the grid cell:

```tsx
export interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  url: string | null;
  alt: string;
}
```

```tsx
{items.map((item) => (
  <div
    key={item.id}
    className="relative flex aspect-square items-center justify-center overflow-hidden bg-[var(--adm-placeholder)]"
  >
    {item.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt={item.alt} className="h-full w-full object-cover" />
    ) : null}
    {item.kind === 'video' ? (
      <span className="absolute inset-0 flex items-center justify-center">
        <PlayGlyph />
      </span>
    ) : null}
  </div>
))}
```

`PlayGlyph` and the grid wrapper `<div className="grid flex-1 grid-cols-6 gap-2.5 overflow-hidden">` are unchanged.

- [ ] **Step 4: Write `lib/console/media.ts`**

Implement `toMediaItem` and `listMediaItems` per the key facts above.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-media.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire the page**

In `app/(console)/admin/console/media/page.tsx`, make the component `async`, drop the `MEDIA_ITEMS` import, pass `items={await listMediaItems()}`. The `Ảnh` / `Video` tab buttons and the `Kéo thả tệp để tải lên` drop zone are unchanged and stay inert.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "MEDIA_ITEMS" app components lib` — expected: no matches.

```bash
git add lib/console/media.ts lib/__tests__/console-media.test.ts components/console/media app/\(console\)/admin/console/media
git commit -m "feat(console): read the media library from payload"
```
