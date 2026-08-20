# Task: build the admin console app shell

Repo: `/home/khoa1661/Ecommerce-Web` (Next.js 15 App Router, TypeScript strict,
Tailwind CSS 4, pnpm).

You are building the navigation shell for a new custom admin console. The console
replaces the Payload CMS admin UI for day-to-day work. This task is ONLY the shell —
no screens, no data, no API calls. Something else fills the content area later.

## What already exists (do not recreate)

- `app/admin-theme.css` — all design tokens as CSS custom properties, scoped to
  `[data-admin]`. Read this file first. Use these variables; do not hardcode colours.
- `app/(console)/admin/layout.tsx` — auth gate, renders `<html>`/`<body data-admin>`,
  imports the theme. You will EDIT this file.
- `app/(console)/admin/console/page.tsx` — currently a redirect stub. You will REPLACE
  its contents.

## Files to create

1. `components/console/nav.ts`
2. `components/console/ConsoleIcons.tsx`
3. `components/console/Sidebar.tsx`
4. `components/console/Topbar.tsx`
5. `components/console/AppShell.tsx`

## Files to edit

6. `app/(console)/admin/layout.tsx` — wrap `{children}` in `<AppShell>`
7. `app/(console)/admin/console/page.tsx` — replace the redirect with a placeholder

---

## 1. `components/console/nav.ts`

Data only. No JSX in this file.

Export a `ConsoleIconName` union type with exactly these members:
`'products' | 'categories' | 'media' | 'crawl' | 'queue' | 'orders' | 'customers' |
'reviews' | 'pages' | 'marketing' | 'settings'`

Export types:

```ts
export interface ConsoleNavItem {
  href: string;
  label: string;
  icon: ConsoleIconName;
  badge?: number;
}

export interface ConsoleNavGroup {
  label: string;
  items: ConsoleNavItem[];
}
```

Export `const CONSOLE_NAV: ConsoleNavGroup[]` with EXACTLY this content. The labels are
Vietnamese and must be copied character for character, diacritics included. Every route
below is a placeholder that does not exist yet — that is expected and correct.

| Group label | Item label | href | icon | badge |
|---|---|---|---|---|
| `Danh mục sản phẩm` | `Sản phẩm` | `/admin/console/products` | products | — |
| | `Danh mục` | `/admin/console/categories` | categories | — |
| | `Thư viện media` | `/admin/console/media` | media | — |
| `Shopee crawler` | `Khởi chạy crawl` | `/admin/console/crawl` | crawl | — |
| | `Hàng đợi duyệt` | `/admin/console/crawl/queue` | queue | `118` |
| `Đơn hàng` | `Đơn hàng` | `/admin/console/orders` | orders | — |
| `Khách hàng` | `Khách hàng` | `/admin/console/customers` | customers | — |
| | `Đánh giá & tương tác` | `/admin/console/reviews` | reviews | — |
| `Nội dung` | `Trang & blog` | `/admin/console/content` | pages | — |
| | `Tiếp thị` | `/admin/console/marketing` | marketing | — |
| `Hệ thống` | `Cài đặt` | `/admin/console/settings` | settings | — |

The `118` badge is a hardcoded placeholder for now. Type it as a number.

## 2. `components/console/ConsoleIcons.tsx`

Export a single component:

```tsx
export function ConsoleIcon({ name, size = 16 }: { name: ConsoleIconName; size?: number })
```

It renders:

```tsx
<svg width={size} height={size} viewBox="0 0 24 24" fill="none"
     stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
  {/* body for `name` */}
</svg>
```

Select the body with a **lookup object keyed by `ConsoleIconName`**, typed
`Record<ConsoleIconName, ReactNode>`. Do not use a switch or an if-chain.

Copy each body verbatim — convert HTML attributes to JSX camelCase
(`stroke-width` → `strokeWidth`, `x1` stays `x1`, `points` stays `points`):

- **products**: `<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><line x1="3" y1="8" x2="12" y2="13"/><line x1="21" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="12" y2="21"/>`
- **categories**: `<polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 13 12 18 21 13"/>`
- **media**: `<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`
- **crawl**: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/>`
- **queue**: `<rect x="5" y="3" width="14" height="18" rx="1"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>`
- **orders**: `<rect x="5" y="3" width="14" height="18" rx="1"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>`
- **customers**: `<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/>`
- **reviews**: `<polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17 6 21 7.5 14 2 9.5 9 9"/>`
- **pages**: `<path d="M6 2h9l5 5v15H6Z"/><polyline points="15 2 15 7 20 7"/>`
- **marketing**: `<path d="M3 10v4h3l6 4V6l-6 4H3Z"/><path d="M17 9a4 4 0 0 1 0 6"/>`
- **settings**: `<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>`

Also export the same way, for the topbar (these are 16–18px, same svg wrapper):

- **search**: `<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>` — strokeWidth 2
- **theme**: `<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>`
- **assistant**: `<rect x="4" y="7" width="16" height="12" rx="2"/><circle cx="9" cy="13" r="1.1" fill="currentColor"/><circle cx="15" cy="13" r="1.1" fill="currentColor"/><line x1="12" y1="7" x2="12" y2="3"/>`

Add `'search' | 'theme' | 'assistant'` to `ConsoleIconName` so one lookup covers all.

## 3. `components/console/Sidebar.tsx`

Props: `{ collapsed: boolean; pathname: string }`. Not a client component itself — it
takes what it needs as props.

**Expanded (`collapsed === false`)** — width `var(--adm-sidebar-w)` (260px), background
`var(--adm-raised)`, 1px right border `var(--adm-line)`, flex column.

- **Brand row**: height `var(--adm-bar-h)` (64px), padding `0 20px`, 1px bottom border
  `var(--adm-line)`, flex row, `gap: 8px`, centred. Contains: a 22×22 square filled
  `var(--adm-ink)`; the text `Lô Hobby` at weight 700 / 14px / `var(--adm-ink)`; and a
  badge `Admin` pushed right with `margin-left: auto`, weight 600 / 10px, colour
  `var(--adm-ink-3)`, background `var(--adm-line)`, padding `2px 6px`.
- **Nav**: padding `16px 16px 8px`, flex column, `gap: 18px` BETWEEN GROUPS.
- **Group**: flex column, `gap: 2px`.
  - Group label: weight 600, 10px, `var(--adm-ink-4)`, uppercase,
    `letter-spacing: .06em`, padding `0 8px 6px`.
  - Item (inactive): flex row, `gap: 10px`, padding `8px`, weight 500, 13px,
    colour `var(--adm-ink-2)`.
  - Item (active): same box PLUS background `var(--adm-surface)`, a 2px LEFT border in
    `var(--adm-ink)`, weight 600, colour `var(--adm-ink)`.
  - Badge (only `Hàng đợi duyệt`): pushed right with `margin-left: auto`, weight 600,
    11px. Use the `.adm-num` class from the theme on it.
- **Active rule**: an item is active when `pathname === item.href` OR `pathname`
  starts with `item.href + '/'`. Compute it in a helper function
  `isNavItemActive(pathname: string, href: string): boolean` exported from `nav.ts`
  so it can be unit-tested.
- **User row**: pinned to the bottom (`margin-top: auto`), padding `16px`. A 28×28
  square, background `var(--adm-ink)`, colour white, centred text `TL`, weight 600 12px.
  Beside it: `Trần Long` at weight 500 / 12px / `var(--adm-ink)`, and beneath that
  `Chủ cửa hàng` at weight 400 / 11px / `var(--adm-ink-3)`. These are placeholder
  values — hardcode them, do not fetch a user.

**Collapsed (`collapsed === true`)** — width `64px`, same background and border, flex
column, `align-items: center`. Show ONLY the 22×22 brand square, the item icons (no
labels, no group labels), and the 28×28 user square. Give each icon-only item a
`title={item.label}` attribute so hovering still identifies it.

## 4. `components/console/Topbar.tsx`

Props: `{ onToggleSidebar: () => void }`.

Height `var(--adm-bar-h)` (64px), 1px bottom border `var(--adm-line)`, flex row,
`align-items: center`, `gap: 16px`, padding `0 24px`.

- A sidebar-toggle button on the left calling `onToggleSidebar`. Use the `queue` icon
  for it (there is no dedicated hamburger in the design); give it
  `aria-label="Thu gọn thanh điều hướng"`.
- **Search**: `flex: 1`, `max-width: 420px`, flex row, `gap: 8px`, padding `8px 12px`,
  background `var(--adm-raised)`, colour `var(--adm-ink-3)`. Contains the `search` icon
  and the text `Tìm sản phẩm, đơn hàng, khách hàng...` at weight 400 / 13px. Render it
  as a non-functional `<button type="button">` — search is not wired up in this task.
- **Right cluster**: `margin-left: auto`, flex row, `align-items: center`, `gap: 14px`:
  - **Locale toggle**: a 1px `var(--adm-line)` bordered row of two spans. `VI` is
    selected: background `var(--adm-ink)`, colour `var(--adm-action-ink)`, weight 600,
    11px, padding `6px 10px`. `EN` is unselected: colour `var(--adm-ink-3)`, same
    weight/size/padding, no background. Static — do not wire it to i18n.
  - **Theme icon**: the `theme` icon at 18px, colour `var(--adm-ink-2)`, inside a
    `<button type="button" aria-label="Đổi giao diện sáng/tối">`. Non-functional.
  - **Assistant button**: flex row, `gap: 6px`, padding `6px 10px`, 1px border
    `var(--adm-ink)`, colour `var(--adm-ink)`. Contains the `assistant` icon at 16px
    and the text `Trợ lý AI` at weight 600 / 11px. Non-functional
    `<button type="button">`.

## 5. `components/console/AppShell.tsx`

`'use client'` — this is the ONLY client component in the task.

Props: `{ children: ReactNode }`.

- Holds `const [collapsed, setCollapsed] = useState(false)`.
- Reads `const pathname = usePathname()` from `next/navigation`.
- Renders a full-height flex row: `<Sidebar collapsed={collapsed} pathname={pathname} />`
  then a `flex: 1` column containing
  `<Topbar onToggleSidebar={() => setCollapsed(v => !v)} />` and a `<main>`.
- `<main>`: `flex: 1`, background `var(--adm-well)`, padding `28px 32px`, and it must
  scroll independently of the sidebar (`overflow-y: auto`, `min-width: 0`).
- The outer element is `height: 100vh; overflow: hidden` so only `<main>` scrolls.

## 6. Edit `app/(console)/admin/layout.tsx`

Keep the auth gate and the `<html>`/`<body data-admin>` exactly as they are. Change only
the body's contents: wrap `{children}` in `<AppShell>`. The shell belongs in the layout,
not the page, so every console screen added later inherits it automatically.

## 7. Replace `app/(console)/admin/console/page.tsx`

Delete the redirect. Export a default server component rendering a heading
`Bảng điều khiển` at weight 700 / 20px / `var(--adm-ink)`, and beneath it a
placeholder box: `flex: 1`, 1px DASHED border `var(--adm-line)`, centred text
`nội dung màn hình` at `var(--adm-ink-3)`.

---

## Styling rules for this task

- Use Tailwind arbitrary-value classes referencing the CSS variables, e.g.
  `bg-[var(--adm-raised)]`, `text-[var(--adm-ink-3)]`,
  `border-[var(--adm-line)]`. `app/**` and `components/**` are both scanned by
  Tailwind, so classes written there are safe.
- Never hardcode a hex colour. Every colour in this task exists as a variable in
  `app/admin-theme.css`. If you think one is missing, stop and say so rather than
  inventing a hex value.
- Border radius is `var(--adm-radius)` (3px) where anything is rounded at all. Most of
  this shell is square — do not add rounding that is not specified above.
- No `border-radius` on the brand square, the user square, the locale toggle, the
  search field, or the assistant button. They are square by design.

## Constraints

- **Do not touch anything under `app/(payload)/`.** That is the existing Payload admin
  and it must keep working.
- Do not add any dependency. Everything needed is already installed.
- Do not add Payload collections, fields, or migrations.
- Do not fetch data, call an API, or read the database. Every value in this shell is a
  hardcoded placeholder.
- Do not wire up search, locale switching, the theme toggle, or the assistant button.
  They render but do nothing. That is intentional.

## Verification

Both must pass:

```
node_modules/.bin/tsc --noEmit -p tsconfig.json
node_modules/.bin/next build
```

`tsc` currently reports ONE pre-existing error in `.next/types/validator.ts`, a
generated file. That one is expected. Any error in `app/` or `components/` is yours.

Add `components/console/__tests__/nav.test.ts` covering `isNavItemActive`:
exact match is active; a child path (`/admin/console/orders/123`) is active; a sibling
prefix (`/admin/console/orders-archive`) is NOT active; an unrelated path is not.
Run it with `node_modules/.bin/vitest run components/console`.
