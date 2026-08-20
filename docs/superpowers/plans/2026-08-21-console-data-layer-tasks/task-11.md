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

### Task 11: Marketing adapter — campaigns and auto-sale — DELEGATED

**Depends on Task 10.** Both tasks modify `lib/console/marketing.ts`, `MarketingTabs.tsx` and `marketing/page.tsx`.

**Files:**
- Modify: `lib/console/marketing.ts`
- Modify: `lib/__tests__/console-marketing.test.ts`
- Modify: `components/console/marketing/CampaignsPanel.tsx`
- Modify: `components/console/marketing/AutoSalePanel.tsx`
- Modify: `app/(console)/admin/console/marketing/page.tsx`

**Design deviation, deliberate.** Prisma's `CampaignStatus` has four members — `DRAFT`, `SCHEDULED`, `SENT`, `CANCELLED` — while the console's `CampaignStatus` has three. Mapping `CANCELLED` onto `draft` would label a cancelled campaign "Bản nháp", which is false. This task adds a fourth member, `'cancelled'`, with the existing `fail` tone and the label `'Đã huỷ'` — the same tone and wording the orders screens already use for a cancelled order, so no new design vocabulary is introduced.

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `getPayload({ config })` on `products` and the `auto-sale-settings` global; `formatVndSymbol` from `@/lib/console/format`.
- Produces (added to `lib/console/marketing.ts`):
  - `toCampaignRow(doc: EmailCampaign): CampaignRow`
  - `listCampaignRows(limit?: number): Promise<CampaignRow[]>`
  - `type AutoSaleFacts = { enabled: boolean; managedCount: number; rows: AutoSaleProductRow[] }`
  - `getAutoSaleFacts(): Promise<AutoSaleFacts>`
  - `toAutoSaleProductRow(doc: Product): AutoSaleProductRow`

**Key facts:**
- Prisma `EmailCampaign`: `{ id: string; name: string; subject: string; body: string; status: CampaignStatus; scheduledAt: Date | null; sentAt: Date | null; recipientCount: number }`.
- `CampaignRow` is `{ id: string; subject: string; status: CampaignStatus }` where `CampaignStatus` is declared in `CampaignsPanel.tsx`. Extend it to `'sent' | 'scheduled' | 'draft' | 'cancelled'` and add the two map entries:
  ```ts
  const STATUS_TONE: Record<CampaignStatus, PillTone> = { …, cancelled: 'fail' };
  const STATUS_LABEL: Record<CampaignStatus, string> = { …, cancelled: 'Đã huỷ' };
  ```
  `sent: 'ok'`, `scheduled: 'busy'`, `draft: 'neutral'` and their labels stay exactly as written.
- `toCampaignRow` lowercases the Prisma enum: `SENT → 'sent'`, `SCHEDULED → 'scheduled'`, `CANCELLED → 'cancelled'`, anything else → `'draft'`. Use an explicit lookup object, not `String.toLowerCase()`, so an unknown value falls through to `'draft'`.
- List campaigns `orderBy: { createdAt: 'desc' }`, default `limit` 50. Precedent for querying `prisma.emailCampaign` directly is `app/(payload)/admin/campaigns/page.tsx`.
- `AutoSaleProductRow` (already defined in `AutoSalePanel.tsx`, do not change) is `{ id: string; title: string; price: string; discount: string }`.
  - `price`: `formatVndSymbol(doc.price)`
  - `discount`: `` `−${doc.salePercent ?? 0}%` `` — U+2212 minus, matching the existing fixture `'−15%'`.
- `getAutoSaleFacts` reads `payload.findGlobal({ slug: 'auto-sale-settings' })` for `enabled`, and `payload.find({ collection: 'products', where: { autoSaleManaged: { equals: true } }, depth: 0, limit: 50, pagination: false })` for the rows. `managedCount` is the row count. Confirm the global's slug string in `src/payload/globals/AutoSaleSettings.ts` before writing it.
- `AutoSalePanel` currently hardcodes an on-toggle and a managed count. Give it `{ facts }: { facts: AutoSaleFacts }`, delete `AUTO_SALE_PRODUCT_ROWS`, drive the toggle's on/off appearance from `facts.enabled` (keep the existing `ToggleOn` markup for the on state; for off, move the knob to `left-[2px]` and use `bg-[var(--adm-line)]` for the track), show `facts.managedCount` where the count is, and map `facts.rows` in the table.
- `CampaignsPanel` gets `{ rows }: { rows: CampaignRow[] }` and its fixture const is deleted. Its `PageHeader`, `Button` and pill markup are unchanged.

- [ ] **Step 1: Add the failing tests**

Append to `lib/__tests__/console-marketing.test.ts`:

```ts
describe('toCampaignRow', () => {
  const BASE_CAMPAIGN = {
    id: 'm1',
    name: 'Tháng 8',
    subject: 'Khuyến mãi tháng 8 — giảm 15%',
    body: '',
    status: 'SENT' as const,
    scheduledAt: null,
    sentAt: new Date('2026-08-20T02:14:00Z'),
    recipientCount: 480,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should map a sent campaign to the sent status', () => {
    expect(toCampaignRow(BASE_CAMPAIGN as never)).toEqual({
      id: 'm1',
      subject: 'Khuyến mãi tháng 8 — giảm 15%',
      status: 'sent',
    });
  });

  it('should map a scheduled campaign to the scheduled status', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'SCHEDULED' } as never).status).toBe(
      'scheduled',
    );
  });

  it('should map a cancelled campaign to the cancelled status rather than to draft', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'CANCELLED' } as never).status).toBe(
      'cancelled',
    );
  });

  it('should fall back to draft when the status is unrecognised', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'WEIRD' } as never).status).toBe('draft');
  });

  it('should fall back to the campaign name when the subject is empty', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, subject: '' } as never).subject).toBe('Tháng 8');
  });
});

describe('toAutoSaleProductRow', () => {
  it('should render the price and the applied discount', () => {
    expect(
      toAutoSaleProductRow({
        id: 12,
        title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
        category: [],
        price: 129000,
        salePercent: 15,
        updatedAt: '',
        createdAt: '',
      } as never),
    ).toEqual({
      id: '12',
      title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      price: '129.000 ₫',
      discount: '−15%',
    });
  });

  it('should render a zero discount when salePercent is unset', () => {
    const row = toAutoSaleProductRow({
      id: 13,
      title: 'Mô Hình Máy Bay Tiêm Kích J20',
      category: [],
      price: 269000,
      salePercent: null,
      updatedAt: '',
      createdAt: '',
    } as never);
    expect(row.discount).toBe('−0%');
  });
});
```

Add `toAutoSaleProductRow` and `toCampaignRow` to the file's existing import from `@/lib/console/marketing`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: FAIL — `toCampaignRow is not a function` (or an import error).

- [ ] **Step 3: Extend `lib/console/marketing.ts`**

Add the five exports listed under **Produces** per the key facts above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: PASS, including the Task 10 tests.

- [ ] **Step 5: Extend `CampaignStatus` and make both panels prop-driven**

Per the key facts above.

- [ ] **Step 6: Wire the page**

In `app/(console)/admin/console/marketing/page.tsx`, extend the existing `Promise.all` to four fetches and pass `<CampaignsPanel rows={campaignRows} />` and `<AutoSalePanel facts={autoSaleFacts} />`.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "CAMPAIGN_ROWS\|AUTO_SALE_PRODUCT_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/marketing.ts lib/__tests__/console-marketing.test.ts components/console/marketing app/\(console\)/admin/console/marketing
git commit -m "feat(console): read email campaigns and auto-sale state"
```
