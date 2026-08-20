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

### Task 9: Content adapter — DELEGATED

**Files:**
- Create: `lib/console/content.ts`
- Test: `lib/__tests__/console-content.test.ts`
- Modify: `components/console/content/PagesList.tsx` (delete `PAGE_ROWS`)
- Modify: `components/console/content/RedirectsList.tsx` (delete `REDIRECT_ROWS`)
- Modify: `components/console/content/PostEditor.tsx`
- Modify: `app/(console)/admin/console/content/page.tsx`
- Modify: `app/(console)/admin/console/content/posts/[id]/page.tsx`

**Design deviation, deliberate.** `PostEditor` is a pure wireframe with `PostEditorProps = { id: string }` and no rendered copy. Building a rich-text editor is out of scope, so this task adds `title: string` and renders it as text where the `--adm-fill-2` title bar is drawn. Every other bar in that wireframe stays a bar.

**Interfaces:**
- Consumes: `getPayload({ config })` on `pages`, `redirects` and `posts`.
- Produces:
  - `toPageRow(doc: Page): PageRow`
  - `toRedirectRow(doc: Redirect): RedirectRow`
  - `listPageRows(limit?: number): Promise<PageRow[]>`
  - `listRedirectRows(limit?: number): Promise<RedirectRow[]>`
  - `getPostEditorProps(id: string): Promise<{ id: string; title: string } | null>`

**Key facts:**
- `PageRow` (already defined in `PagesList.tsx`, do not change) is `{ id: string; title: string; path: string; status: 'published' | 'draft' }`.
- `import type { Page } from '@/src/payload/payload-types'`: `{ id: number; title: string; slug?: string | null; … }`. Inspect `src/payload/collections/Pages.ts` for the published/draft field. If the collection uses Payload drafts (`_status`), read `(doc as { _status?: string })._status === 'published'`; if it has an explicit `status` field like `Posts` does, read that. Check before writing.
- `path` is `'/'` when the slug is empty or `'home'`, else `` `/${slug}` ``. Do not double the leading slash.
- `RedirectRow` (already defined in `RedirectsList.tsx`) is `{ id: string; from: string; to: string }`. `Redirect` is `{ id: number; from: string; to: string; type: '301' | '302'; enabled?: boolean | null }`. List only `enabled !== false`, sorted `-createdAt`.
- `import type { Post } from '@/src/payload/payload-types'`: `{ id: number; title: string; status: 'draft' | 'published' }`. `getPostEditorProps` uses `payload.findByID({ collection: 'posts', id: Number(id), depth: 0 })` in a try/catch returning `null`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-content.test.ts`:

```ts
// lib/__tests__/console-content.test.ts
import { describe, it, expect } from 'vitest';
import type { Page, Redirect } from '@/src/payload/payload-types';
import { toPageRow, toRedirectRow } from '@/lib/console/content';

function makePage(overrides: Partial<Page> = {}): Page {
  return { id: 2, title: 'Giới thiệu', slug: 'gioi-thieu', updatedAt: '', createdAt: '', ...overrides } as Page;
}

describe('toPageRow', () => {
  it('should map a published page to its console row', () => {
    const row = toPageRow(makePage({ _status: 'published' } as never));
    expect(row).toEqual({ id: '2', title: 'Giới thiệu', path: '/gioi-thieu', status: 'published' });
  });

  it('should render the root path when the slug is home', () => {
    expect(toPageRow(makePage({ slug: 'home' })).path).toBe('/');
  });

  it('should render the root path when the slug is missing', () => {
    expect(toPageRow(makePage({ slug: null })).path).toBe('/');
  });

  it('should not double the leading slash when the slug already has one', () => {
    expect(toPageRow(makePage({ slug: '/doi-tra' })).path).toBe('/doi-tra');
  });

  it('should default an unpublished page to draft', () => {
    expect(toPageRow(makePage()).status).toBe('draft');
  });

  it('should render a placeholder title when the page has none', () => {
    expect(toPageRow(makePage({ title: '' })).title).toBe('Chưa đặt tiêu đề');
  });
});

describe('toRedirectRow', () => {
  it('should map a redirect to its console row', () => {
    const doc = {
      id: 9,
      from: '/khuyen-mai-cu',
      to: '/khuyen-mai',
      type: '301',
      enabled: true,
      updatedAt: '',
      createdAt: '',
    } as Redirect;
    expect(toRedirectRow(doc)).toEqual({ id: '9', from: '/khuyen-mai-cu', to: '/khuyen-mai' });
  });
});
```

If `Pages` turns out not to use Payload drafts, change the first test's `_status` to whatever field the collection actually has and keep the assertion.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/content.ts`**

Implement the five exports per the key facts above.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-content.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the two fixtures**

Delete `PAGE_ROWS` from `PagesList.tsx` and `REDIRECT_ROWS` from `RedirectsList.tsx`. The interfaces, `STATUS_LABEL`, `Arrow` and both tables are unchanged.

- [ ] **Step 6: Add the post title to the editor wireframe**

In `components/console/content/PostEditor.tsx`:

```tsx
export interface PostEditorProps {
  id: string;
  title: string;
}

export function PostEditor({ title }: PostEditorProps) {
```

Replace the first `<Bar height={30} width="60%" tone="bg-[var(--adm-fill-2)]" />` with:

```tsx
<div className="text-[22px] font-bold leading-none text-[var(--adm-ink)]">{title}</div>
```

Every other `Bar`, the divider, the 300px rail, the `Danh mục blog` and `SEO` labels are unchanged. `Bar` is still used by the remaining bars, so keep it.

- [ ] **Step 7: Wire both pages**

In `app/(console)/admin/console/content/page.tsx`, make the component `async`, drop the two fixture imports, and fetch both lists with `Promise.all` before the `return`. Pass `rows={pageRows}` and `rows={redirectRows}`. The `ContentTabs`, both `PageHeader`/heading blocks and both `Button`s are unchanged and stay inert.

In `app/(console)/admin/console/content/posts/[id]/page.tsx`, call `getPostEditorProps(id)`, `notFound()` on `null`, and spread the result into `<PostEditor {...post} />`.

- [ ] **Step 8: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "PAGE_ROWS\|REDIRECT_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/content.ts lib/__tests__/console-content.test.ts components/console/content app/\(console\)/admin/console/content
git commit -m "feat(console): read pages, redirects and posts from payload"
```
