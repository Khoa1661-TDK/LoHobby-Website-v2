# Page-Builder Block Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new page-builder blocks (Pricing Table, Countdown, Tabs/Accordion, Feature List) and 4 shared customization knobs (content alignment, rounded+border, custom max-width, scroll animation) that apply to every block.

**Architecture:** New blocks follow the existing 7-point wiring (Payload schema → barrel → Pages `layoutBlocks` → React component → `RenderBlocks` switch → `block-schemas` registry → `PageBlock` union), then one consolidated Payload migration. Shared knobs extend `appearanceFields`, the `BlockAppearance` type, and `blockAppearanceClasses()` once. Scroll animation uses a thin client `RevealOnScroll` wrapper applied in `RenderBlocks`, keeping blocks as server components.

**Tech Stack:** Next.js 15, Payload CMS 3.84, React, TypeScript (strict), Tailwind CSS 4, lucide-react 0.484, Vitest.

## Global Constraints

- **No regex literals with character classes (`[...]`) in any `lib/` file.** They break the whole Tailwind stylesheet (the scanner misreads them). Sanitize numbers with `Number.parseInt`, not `.replace(/[^0-9]/g,'')`.
- `lib/**/*.{ts,tsx}` IS in Tailwind's `content` globs — class strings returned from `lib/page-builder.ts` are scanned and safe, but only if statically written (no dynamic `max-w-[${x}]`).
- Test files MUST `import { describe, it, expect } from 'vitest'` — globals are runtime-only; `tsc --noEmit` needs the imports.
- **Client components that use hooks** (Countdown, Tabs) must be tested via JSX (`renderToStaticMarkup(<X .../>)`), never by direct call `X({...})` — a direct call triggers "Invalid hook call".
- Run tooling via `node_modules/.bin/<bin>` directly (e.g. `node_modules/.bin/vitest run`, `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/payload ...`) — `pnpm <script>` fails the repo's deps-status check.
- A new Payload block/field WITHOUT a generated migration throws Postgres `42P01` at runtime. `DATABASE_URL` is a remote Postgres whose ledger is drifted behind `src/migrations/` — review generated SQL by hand before trusting it (Task 7).
- New blocks omit `imageURL`/`imageAltText` (no preview SVG assets exist for them; a missing one shows a broken image in the picker). This is intentional.

---

### Task 1: Shared customization knobs — alignment, rounded+border, custom max-width

**Files:**
- Modify: `src/payload/blocks/_appearance.ts`
- Modify: `lib/page-builder.ts` (`BlockAppearance` type + `blockAppearanceClasses`)
- Modify: `lib/page-builder/block-schemas.ts` (`describeCondition`)
- Modify: `app/globals.css` (`.blk-maxw` rule)
- Test: `components/blocks/__tests__/appearance.test.ts`

**Interfaces:**
- Produces: extended `BlockAppearance` with `contentAlign?: 'left'|'center'|'right'|null`, `rounded?: 'none'|'sm'|'md'|'lg'|'xl'|null`, `border?: boolean|null`, `maxWidthCustom?: string|null`, and `containerWidth` gains `'custom'`. `blockAppearanceClasses()` keeps its `{ section, container, style }` return shape.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/appearance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { blockAppearanceClasses } from '@/lib/page-builder';

describe('blockAppearanceClasses customization', () => {
  it('should add text-center when contentAlign is center', () => {
    expect(blockAppearanceClasses({ contentAlign: 'center' }).container).toContain('text-center');
  });

  it('should add rounded, overflow-hidden and border classes to the section', () => {
    const { section } = blockAppearanceClasses({ rounded: 'lg', border: true });
    expect(section).toContain('rounded-lg');
    expect(section).toContain('overflow-hidden');
    expect(section).toContain('border border-line');
  });

  it('should set --blk-maxw and the blk-maxw class for a custom width', () => {
    const { container, style } = blockAppearanceClasses({
      containerWidth: 'custom',
      maxWidthCustom: '720px',
    });
    expect(container).toContain('blk-maxw');
    expect(style['--blk-maxw']).toBe('720px');
  });

  it('should ignore an invalid custom max-width', () => {
    const { style } = blockAppearanceClasses({ containerWidth: 'custom', maxWidthCustom: 'abc' });
    expect(style['--blk-maxw']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/appearance.test.ts`
Expected: FAIL (assertions don't match — classes/vars not produced yet).

- [ ] **Step 3: Extend the `BlockAppearance` type and `blockAppearanceClasses`**

In `lib/page-builder.ts`, replace the `BlockAppearance` type (lines 3-9) with:

```ts
export type BlockAppearance = {
  background?: 'theme' | 'light' | 'dark' | 'custom' | null;
  backgroundCustom?: string | null;
  backgroundCustomDark?: string | null;
  containerWidth?: 'narrow' | 'normal' | 'wide' | 'full' | 'custom' | null;
  maxWidthCustom?: string | null;
  paddingY?: 'compact' | 'base' | 'spacious' | 'none' | null;
  contentAlign?: 'left' | 'center' | 'right' | null;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | null;
  border?: boolean | null;
  animate?: 'none' | 'reveal-up' | 'reveal-right' | 'scale-in' | null;
};
```

Then in `blockAppearanceClasses`, update the `widthClass` block to handle `'custom'`:

```ts
  const widthClass = (() => {
    switch (appearance.containerWidth) {
      case 'narrow':
        return 'mx-auto max-w-3xl';
      case 'wide':
        return 'mx-auto max-w-screen-2xl';
      case 'full':
        return '';
      case 'custom':
        return 'mx-auto blk-maxw';
      default:
        return 'mx-auto max-w-screen-xl';
    }
  })();
```

Add these three derived classes right after `pyClass` (before `const customStyle`):

```ts
  const alignClass = (() => {
    switch (appearance.contentAlign) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return '';
    }
  })();

  const roundedClass = (() => {
    switch (appearance.rounded) {
      case 'sm':
        return 'rounded-sm overflow-hidden';
      case 'md':
        return 'rounded-md overflow-hidden';
      case 'lg':
        return 'rounded-lg overflow-hidden';
      case 'xl':
        return 'rounded-xl overflow-hidden';
      default:
        return '';
    }
  })();

  const borderClass = appearance.border ? 'border border-line' : '';
```

Inside the `customStyle` build (after the existing `--blk-bg` block), add — note `Number.parseInt`, NO regex:

```ts
  if (appearance.containerWidth === 'custom' && appearance.maxWidthCustom) {
    const px = Number.parseInt(String(appearance.maxWidthCustom), 10);
    if (Number.isFinite(px) && px > 0) {
      customStyle['--blk-maxw'] = `${px}px`;
    }
  }
```

Replace the final `return`:

```ts
  return {
    section: [bgClass, pyClass, roundedClass, borderClass].filter(Boolean).join(' '),
    container: [widthClass, 'px-4', alignClass].filter(Boolean).join(' '),
    style: customStyle,
  };
```

- [ ] **Step 4: Add the new appearance fields**

In `src/payload/blocks/_appearance.ts`, add `{ label: 'Custom (px)', value: 'custom' }` to the `containerWidth` options array, then append these fields to `appearanceFields` (before the closing `]`):

```ts
  {
    name: 'maxWidthCustom',
    type: 'text',
    admin: {
      condition: (_, siblingData) => siblingData?.containerWidth === 'custom',
      description: 'Custom max content width in pixels, e.g. 720.',
      placeholder: '720',
    },
  },
  {
    name: 'contentAlign',
    type: 'select',
    defaultValue: 'left',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
    admin: { description: 'Horizontal alignment of the section content.' },
  },
  {
    name: 'rounded',
    type: 'select',
    defaultValue: 'none',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra large', value: 'xl' },
    ],
    admin: { description: 'Corner radius for the section.' },
  },
  {
    name: 'border',
    type: 'checkbox',
    defaultValue: false,
    admin: { description: 'Show a thin border around the section.' },
  },
```

- [ ] **Step 5: Teach the schema condition prober about `containerWidth: 'custom'`**

In `lib/page-builder/block-schemas.ts`, in `describeCondition`, change the candidate loop (line ~100) from `['background']` to:

```ts
  for (const candidate of ['background', 'containerWidth'] as const) {
```

(The inner value loop already tries `'custom'`, which is correct for both.)

- [ ] **Step 6: Add the `.blk-maxw` CSS rule**

In `app/globals.css`, immediately after the `.dark .blk-custom-bg { ... }` rule (line ~168, still inside the same `@layer`), add:

```css
  /* Custom max-width emitted as --blk-maxw by blockAppearanceClasses() when
     containerWidth === 'custom'. The var is set on the section; the container
     child reads it via this class. */
  .blk-maxw {
    max-width: var(--blk-maxw);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/appearance.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — Expected: no errors.

```bash
git add src/payload/blocks/_appearance.ts lib/page-builder.ts lib/page-builder/block-schemas.ts app/globals.css components/blocks/__tests__/appearance.test.ts
git commit -m "feat(page-builder): shared alignment, rounded/border, custom max-width knobs"
```

---

### Task 2: Scroll animation — `animate` knob + RevealOnScroll wrapper

**Files:**
- Create: `components/blocks/RevealOnScroll.tsx`
- Modify: `src/payload/blocks/_appearance.ts` (add `animate` field)
- Modify: `components/blocks/RenderBlocks.tsx` (wrap animated blocks)
- Test: `components/blocks/__tests__/reveal-on-scroll.test.tsx`

**Interfaces:**
- Consumes: `BlockAppearance.animate` (added to the type in Task 1).
- Produces: `RevealOnScroll` default export — `({ animate: string, children: ReactNode }) => ReactElement`.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/reveal-on-scroll.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RevealOnScroll from '@/components/blocks/RevealOnScroll';

describe('RevealOnScroll', () => {
  it('should render children visible on the server (no opacity-0 lock without JS)', () => {
    const html = renderToStaticMarkup(
      <RevealOnScroll animate="reveal-up">
        <p>hello world</p>
      </RevealOnScroll>,
    );
    expect(html).toContain('hello world');
    expect(html).not.toContain('opacity-0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/reveal-on-scroll.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement RevealOnScroll**

Create `components/blocks/RevealOnScroll.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

const ANIM_CLASS: Record<string, string> = {
  'reveal-up': 'motion-safe:animate-reveal-up',
  'reveal-right': 'motion-safe:animate-reveal-right',
  'scale-in': 'motion-safe:animate-scale-in',
};

type Props = { animate: string; children: ReactNode };

/** Reveal `children` with the chosen animation when they scroll into view.
 *  State stays 'idle' on the server and first paint, so without JS the content
 *  is always visible (no opacity-0 lock-in). On mount JS hides it, then the
 *  IntersectionObserver flips it to 'shown' once, triggering the animation. */
export default function RevealOnScroll({ animate, children }: Props): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setState('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('shown');
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cls =
    state === 'hidden'
      ? 'opacity-0'
      : state === 'shown'
        ? (ANIM_CLASS[animate] ?? '')
        : '';

  return (
    <div ref={ref} className={cls}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/reveal-on-scroll.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the `animate` appearance field**

In `src/payload/blocks/_appearance.ts`, append to `appearanceFields`:

```ts
  {
    name: 'animate',
    type: 'select',
    defaultValue: 'none',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Reveal up', value: 'reveal-up' },
      { label: 'Reveal from left', value: 'reveal-right' },
      { label: 'Scale in', value: 'scale-in' },
    ],
    admin: { description: 'Animation when the section scrolls into view.' },
  },
```

- [ ] **Step 6: Wrap animated blocks in RenderBlocks**

In `components/blocks/RenderBlocks.tsx`, add the import at the top of the component imports:

```tsx
import RevealOnScroll from './RevealOnScroll';
```

Rename the existing `BlockRenderer` function to `renderInner` (keep its body/switch identical), then add a new `BlockRenderer` above it:

```tsx
function BlockRenderer({ block }: { block: PageBlock }): ReactElement | null {
  const inner = renderInner(block);
  if (!inner) return null;
  const animate = (block as { animate?: string | null }).animate;
  if (animate && animate !== 'none') {
    return <RevealOnScroll animate={animate}>{inner}</RevealOnScroll>;
  }
  return inner;
}

function renderInner({ block }: { block: PageBlock }): ReactElement | null {
  switch (block.blockType) {
    // ...unchanged existing cases...
  }
}
```

- [ ] **Step 7: Run full block tests + typecheck**

Run: `node_modules/.bin/vitest run components/blocks/`
Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add components/blocks/RevealOnScroll.tsx components/blocks/RenderBlocks.tsx src/payload/blocks/_appearance.ts components/blocks/__tests__/reveal-on-scroll.test.tsx
git commit -m "feat(page-builder): scroll-reveal animation knob via RevealOnScroll wrapper"
```

---

### Task 3: Pricing Table block (`pricingTable`)

**Files:**
- Create: `src/payload/blocks/PricingTable.ts`, `components/blocks/PricingTable.tsx`
- Modify: `src/payload/blocks/index.ts`, `src/payload/collections/Pages.ts`, `components/blocks/RenderBlocks.tsx`, `lib/page-builder/block-schemas.ts`, `lib/page-builder.ts` (union)
- Test: `components/blocks/__tests__/pricing-table.test.tsx`

**Interfaces:**
- Produces: `PricingTable` Payload `Block` (slug `pricingTable`); `PricingTableBlock` default React export — sync server component `(props) => ReactElement | null`.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/pricing-table.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PricingTableBlock from '@/components/blocks/PricingTable';

describe('PricingTableBlock', () => {
  it('should render null when there are no tiers', () => {
    expect(PricingTableBlock({ tiers: [] })).toBeNull();
  });

  it('should render heading, tier name, price and features', () => {
    const html = renderToStaticMarkup(
      <PricingTableBlock
        heading="Plans"
        tiers={[
          { name: 'Pro', price: '$9', period: 'mo', features: [{ text: 'Unlimited prints' }], highlighted: true },
        ]}
      />,
    );
    expect(html).toContain('Plans');
    expect(html).toContain('Pro');
    expect(html).toContain('$9');
    expect(html).toContain('Unlimited prints');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/pricing-table.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Payload schema**

Create `src/payload/blocks/PricingTable.ts`:

```ts
// src/payload/blocks/PricingTable.ts — tiered pricing cards.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const PricingTable: Block = {
  slug: 'pricingTable',
  labels: { singular: 'Pricing Table', plural: 'Pricing Tables' },
  interfaceName: 'PricingTableBlock',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    {
      name: 'tiers',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'text', required: true },
        { name: 'period', type: 'text' },
        { name: 'description', type: 'textarea' },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaHref', type: 'text' },
        { name: 'highlighted', type: 'checkbox', defaultValue: false },
      ],
    },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 4: Create the React component**

Create `components/blocks/PricingTable.tsx`:

```tsx
// components/blocks/PricingTable.tsx — tiered pricing cards.
import type { ReactElement } from 'react';
import Link from 'next/link';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Feature = { text?: string | null };
type Tier = {
  name?: string | null;
  price?: string | null;
  period?: string | null;
  description?: string | null;
  features?: Feature[] | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  highlighted?: boolean | null;
};
type Props = {
  heading?: string | null;
  subheading?: string | null;
  tiers?: Tier[] | null;
} & BlockAppearance;

export default function PricingTableBlock(props: Props): ReactElement | null {
  const { heading, subheading, tiers } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const filtered = (tiers ?? []).filter((t) => t?.name || t?.price);
  if (filtered.length === 0) return null;

  const cols =
    filtered.length >= 3 ? 'md:grid-cols-3' : filtered.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-3 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink/60">{subheading}</p>
        ) : null}
        <div className={`grid grid-cols-1 gap-6 ${cols}`}>
          {filtered.map((tier, i) => (
            <div
              key={i}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.highlighted ? 'border-accent shadow-soft-lg' : 'border-line'
              }`}
            >
              <h3 className="font-display text-lg font-semibold text-ink">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tracking-tight">{tier.price}</span>
                {tier.period ? <span className="text-sm text-ink/50">/{tier.period}</span> : null}
              </div>
              {tier.description ? <p className="mt-2 text-sm text-ink/60">{tier.description}</p> : null}
              {tier.features && tier.features.length > 0 ? (
                <ul className="mt-5 space-y-2 text-sm text-ink/70">
                  {tier.features
                    .filter((f) => f?.text)
                    .map((f, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-0.5 text-accent">✓</span>
                        <span>{f.text}</span>
                      </li>
                    ))}
                </ul>
              ) : null}
              {tier.ctaLabel && tier.ctaHref ? (
                <Link
                  href={tier.ctaHref}
                  {...linkAttrs(tier.ctaHref)}
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${
                    tier.highlighted
                      ? 'bg-ink text-surface hover:opacity-90'
                      : 'border border-line text-ink hover:bg-surface-raised'
                  }`}
                >
                  {tier.ctaLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Wire the block into all 5 registries**

1. `src/payload/blocks/index.ts` — append: `export { PricingTable } from './PricingTable';`
2. `src/payload/collections/Pages.ts` — add `PricingTable` to the import list from `@/src/payload/blocks` AND to the `layoutBlocks` array.
3. `lib/page-builder/block-schemas.ts` — add `PricingTable` to the import from `@/src/payload/blocks` AND to `REGISTERED_BLOCKS`.
4. `lib/page-builder.ts` — add to the `PageBlock` union: `| ({ blockType: 'pricingTable' } & Record<string, unknown>)`
5. `components/blocks/RenderBlocks.tsx` — add `import PricingTableBlock from './PricingTable';` and inside `renderInner`'s switch:

```tsx
    case 'pricingTable':
      return <PricingTableBlock {...asProps<ComponentProps<typeof PricingTableBlock>>(block)} />;
```

- [ ] **Step 6: Run test + typecheck**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/pricing-table.test.tsx`
Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/payload/blocks/PricingTable.ts components/blocks/PricingTable.tsx src/payload/blocks/index.ts src/payload/collections/Pages.ts lib/page-builder/block-schemas.ts lib/page-builder.ts components/blocks/RenderBlocks.tsx components/blocks/__tests__/pricing-table.test.tsx
git commit -m "feat(page-builder): pricing table block"
```

---

### Task 4: Countdown Timer block (`countdown`)

**Files:**
- Create: `src/payload/blocks/Countdown.ts`, `components/blocks/Countdown.tsx`
- Modify: same 5 registries as Task 3
- Test: `components/blocks/__tests__/countdown.test.tsx`

**Interfaces:**
- Produces: `Countdown` Payload `Block` (slug `countdown`); `CountdownBlock` default export — **client** component (uses hooks); named export `computeRemaining(target: number, now: number): { days; hours; minutes; seconds; done }`.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/countdown.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CountdownBlock, { computeRemaining } from '@/components/blocks/Countdown';

describe('computeRemaining', () => {
  it('should break a future diff into days/hours/minutes/seconds', () => {
    const target = (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000; // 1d 2h 3m 4s from 0
    expect(computeRemaining(target, 0)).toMatchObject({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      done: false,
    });
  });

  it('should mark done when the target has passed', () => {
    expect(computeRemaining(0, 1000).done).toBe(true);
  });
});

describe('CountdownBlock', () => {
  it('should render nothing without a valid targetDate', () => {
    expect(renderToStaticMarkup(<CountdownBlock targetDate={null} />)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/countdown.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Payload schema**

Create `src/payload/blocks/Countdown.ts`:

```ts
// src/payload/blocks/Countdown.ts — live countdown to a target date.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Countdown: Block = {
  slug: 'countdown',
  labels: { singular: 'Countdown Timer', plural: 'Countdown Timers' },
  interfaceName: 'CountdownBlock',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'targetDate',
      type: 'text',
      required: true,
      admin: { description: 'Target date/time in ISO 8601, e.g. 2026-12-31T23:59:59Z' },
    },
    { name: 'expiredText', type: 'text', defaultValue: 'This offer has ended.' },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaHref', type: 'text' },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 4: Create the React component**

Create `components/blocks/Countdown.tsx`:

```tsx
// components/blocks/Countdown.tsx — live ticking countdown.
'use client';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  heading?: string | null;
  targetDate?: string | null;
  expiredText?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
} & BlockAppearance;

export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function computeRemaining(target: number, now: number): Remaining {
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
    minutes: Math.floor(diff / (1000 * 60)) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    done: diff <= 0,
  };
}

export default function CountdownBlock(props: Props): ReactElement | null {
  const { heading, targetDate, expiredText, ctaLabel, ctaHref } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const target = targetDate ? Date.parse(targetDate) : Number.NaN;
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const tick = () => setRemaining(computeRemaining(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  const units = remaining
    ? [
        { label: 'Days', value: remaining.days },
        { label: 'Hours', value: remaining.hours },
        { label: 'Minutes', value: remaining.minutes },
        { label: 'Seconds', value: remaining.seconds },
      ]
    : [];

  return (
    <section className={section} style={style}>
      <div className={`${container} text-center`}>
        {heading ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>
        ) : null}
        {remaining?.done ? (
          <p className="text-lg text-ink/70">{expiredText}</p>
        ) : (
          <div className="flex items-center justify-center gap-4 md:gap-6" suppressHydrationWarning>
            {units.map((u) => (
              <div key={u.label} className="min-w-[64px] rounded-xl border border-line px-3 py-4">
                <div className="font-display text-3xl font-bold tabular-nums md:text-4xl">
                  {String(u.value).padStart(2, '0')}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{u.label}</div>
              </div>
            ))}
          </div>
        )}
        {!remaining?.done && ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            {...linkAttrs(ctaHref)}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface transition hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Wire into the 5 registries**

Same five edits as Task 3, using:
- index: `export { Countdown } from './Countdown';`
- Pages.ts: add `Countdown` to import + `layoutBlocks`.
- block-schemas.ts: add `Countdown` to import + `REGISTERED_BLOCKS`.
- page-builder.ts union: `| ({ blockType: 'countdown' } & Record<string, unknown>)`
- RenderBlocks.tsx: `import CountdownBlock from './Countdown';` and case:

```tsx
    case 'countdown':
      return <CountdownBlock {...asProps<ComponentProps<typeof CountdownBlock>>(block)} />;
```

- [ ] **Step 6: Run test + typecheck**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/countdown.test.tsx`
Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/payload/blocks/Countdown.ts components/blocks/Countdown.tsx src/payload/blocks/index.ts src/payload/collections/Pages.ts lib/page-builder/block-schemas.ts lib/page-builder.ts components/blocks/RenderBlocks.tsx components/blocks/__tests__/countdown.test.tsx
git commit -m "feat(page-builder): countdown timer block"
```

---

### Task 5: Tabs / Accordion block (`tabs`)

**Files:**
- Create: `src/payload/blocks/Tabs.ts`, `components/blocks/Tabs.tsx`
- Modify: same 5 registries
- Test: `components/blocks/__tests__/tabs.test.tsx`

**Interfaces:**
- Produces: `Tabs` Payload `Block` (slug `tabs`); `TabsBlock` default export — **client** component with `variant: 'tabs' | 'accordion'`.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/tabs.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TabsBlock from '@/components/blocks/Tabs';

describe('TabsBlock', () => {
  it('should render nothing with no items', () => {
    expect(renderToStaticMarkup(<TabsBlock items={[]} />)).toBe('');
  });

  it('should render a tablist with all labels in tabs variant', () => {
    const html = renderToStaticMarkup(
      <TabsBlock variant="tabs" items={[{ label: 'One' }, { label: 'Two' }]} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('One');
    expect(html).toContain('Two');
  });

  it('should render expandable buttons in accordion variant', () => {
    const html = renderToStaticMarkup(
      <TabsBlock variant="accordion" items={[{ label: 'Q1' }]} />,
    );
    expect(html).toContain('aria-expanded');
    expect(html).toContain('Q1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/tabs.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the Payload schema**

Create `src/payload/blocks/Tabs.ts`:

```ts
// src/payload/blocks/Tabs.ts — tabbed panels or accordion (variant toggle).
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Tabs: Block = {
  slug: 'tabs',
  labels: { singular: 'Tabs / Accordion', plural: 'Tabs / Accordions' },
  interfaceName: 'TabsBlock',
  fields: [
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'tabs',
      options: [
        { label: 'Tabs', value: 'tabs' },
        { label: 'Accordion', value: 'accordion' },
      ],
    },
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'content', type: 'richText' },
      ],
    },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 4: Create the React component**

Create `components/blocks/Tabs.tsx`:

```tsx
// components/blocks/Tabs.tsx — tabs or accordion, switched by variant.
'use client';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { renderLexical } from './_primitives';

type Item = { label?: string | null; content?: Record<string, unknown> | null };
type Props = {
  variant?: 'tabs' | 'accordion' | null;
  heading?: string | null;
  items?: Item[] | null;
} & BlockAppearance;

export default function TabsBlock(props: Props): ReactElement | null {
  const { variant = 'tabs', heading, items } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const [active, setActive] = useState(0);
  const [openSet, setOpenSet] = useState<Record<number, boolean>>({ 0: true });

  const filtered = (items ?? []).filter((it) => it?.label);
  if (filtered.length === 0) return null;

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}

        {variant === 'accordion' ? (
          <div className="mx-auto max-w-2xl space-y-3">
            {filtered.map((it, i) => {
              const open = Boolean(openSet[i]);
              return (
                <div key={i} className="rounded-xl border border-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSet((s) => ({ ...s, [i]: !s[i] }))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink"
                  >
                    {it.label}
                    <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {open ? (
                    <div className="px-5 pb-4 text-sm text-ink/70">
                      {it.content ? renderLexical(it.content) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div role="tablist" className="flex flex-wrap gap-2 border-b border-line">
              {filtered.map((it, i) => (
                <button
                  key={i}
                  role="tab"
                  type="button"
                  aria-selected={active === i}
                  onClick={() => setActive(i)}
                  className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                    active === i
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink/50 hover:text-ink'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="pt-6 text-sm text-ink/70">
              {filtered[active]?.content ? renderLexical(filtered[active].content) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Wire into the 5 registries**

- index: `export { Tabs } from './Tabs';`
- Pages.ts: add `Tabs` to import + `layoutBlocks`.
- block-schemas.ts: add `Tabs` to import + `REGISTERED_BLOCKS`.
- page-builder.ts union: `| ({ blockType: 'tabs' } & Record<string, unknown>)`
- RenderBlocks.tsx: `import TabsBlock from './Tabs';` and case:

```tsx
    case 'tabs':
      return <TabsBlock {...asProps<ComponentProps<typeof TabsBlock>>(block)} />;
```

- [ ] **Step 6: Run test + typecheck**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/tabs.test.tsx`
Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/payload/blocks/Tabs.ts components/blocks/Tabs.tsx src/payload/blocks/index.ts src/payload/collections/Pages.ts lib/page-builder/block-schemas.ts lib/page-builder.ts components/blocks/RenderBlocks.tsx components/blocks/__tests__/tabs.test.tsx
git commit -m "feat(page-builder): tabs/accordion block"
```

---

### Task 6: Feature List with Icons block (`featureGrid`)

**Files:**
- Create: `lib/page-builder/feature-icons.ts`, `src/payload/blocks/FeatureGrid.ts`, `components/blocks/FeatureGrid.tsx`
- Modify: same 5 registries
- Test: `components/blocks/__tests__/feature-grid.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FEATURE_ICON_NAMES` (readonly string tuple) + `FEATURE_ICON_OPTIONS` (`{label;value}[]`) from `feature-icons.ts`; `FeatureGrid` Payload `Block` (slug `featureGrid`); `FeatureGridBlock` default export — sync server component.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/feature-grid.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FeatureGridBlock from '@/components/blocks/FeatureGrid';

describe('FeatureGridBlock', () => {
  it('should render null with no items', () => {
    expect(FeatureGridBlock({ items: [] })).toBeNull();
  });

  it('should render titles, text and an icon svg when provided', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'zap', title: 'Fast', text: 'Quick prints' }]} />,
    );
    expect(html).toContain('Fast');
    expect(html).toContain('Quick prints');
    expect(html).toContain('<svg');
  });

  it('should skip an unknown icon name without crashing', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'nonsense', title: 'Still ok' }]} />,
    );
    expect(html).toContain('Still ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/feature-grid.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create the icon name list (no lucide import — schema-safe)**

Create `lib/page-builder/feature-icons.ts`:

```ts
// lib/page-builder/feature-icons.ts — curated icon names for the Feature List block.
// Kept lucide-free so the Payload schema can import the options without bundling icons.
export const FEATURE_ICON_NAMES = [
  'zap', 'truck', 'shield', 'star',
  'box', 'layers', 'printer', 'sparkles',
  'heart', 'clock', 'award', 'package',
  'wrench', 'ruler', 'palette', 'thumbsUp',
] as const;

export type FeatureIconName = (typeof FEATURE_ICON_NAMES)[number];

export const FEATURE_ICON_OPTIONS = FEATURE_ICON_NAMES.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));
```

- [ ] **Step 4: Create the Payload schema**

Create `src/payload/blocks/FeatureGrid.ts`:

```ts
// src/payload/blocks/FeatureGrid.ts — icon + title + text feature grid.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { FEATURE_ICON_OPTIONS } from '@/lib/page-builder/feature-icons';

export const FeatureGrid: Block = {
  slug: 'featureGrid',
  labels: { singular: 'Feature List', plural: 'Feature Lists' },
  interfaceName: 'FeatureGridBlock',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'icon', type: 'select', options: FEATURE_ICON_OPTIONS },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 5: Create the React component**

Create `components/blocks/FeatureGrid.tsx`:

```tsx
// components/blocks/FeatureGrid.tsx — icon + title + text grid.
import type { ComponentType, ReactElement } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Zap, Truck, Shield, Star, Box, Layers, Printer, Sparkles,
  Heart, Clock, Award, Package, Wrench, Ruler, Palette, ThumbsUp,
} from 'lucide-react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  zap: Zap, truck: Truck, shield: Shield, star: Star,
  box: Box, layers: Layers, printer: Printer, sparkles: Sparkles,
  heart: Heart, clock: Clock, award: Award, package: Package,
  wrench: Wrench, ruler: Ruler, palette: Palette, thumbsUp: ThumbsUp,
};

type Item = { icon?: string | null; title?: string | null; text?: string | null };
type Props = {
  heading?: string | null;
  subheading?: string | null;
  columns?: '2' | '3' | '4' | null;
  items?: Item[] | null;
} & BlockAppearance;

export default function FeatureGridBlock(props: Props): ReactElement | null {
  const { heading, subheading, columns = '3', items } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const filtered = (items ?? []).filter((it) => it?.title || it?.text);
  if (filtered.length === 0) return null;

  const colClass =
    columns === '2'
      ? 'sm:grid-cols-2'
      : columns === '4'
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-3 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink/60">{subheading}</p>
        ) : null}
        <div className={`grid grid-cols-1 gap-8 ${colClass}`}>
          {filtered.map((it, i) => {
            const Icon = it.icon ? ICONS[it.icon] : undefined;
            return (
              <div key={i} className="flex flex-col items-start">
                {Icon ? (
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : null}
                {it.title ? <h3 className="font-display text-base font-semibold text-ink">{it.title}</h3> : null}
                {it.text ? <p className="mt-1.5 text-sm text-ink/60">{it.text}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Wire into the 5 registries**

- index: `export { FeatureGrid } from './FeatureGrid';`
- Pages.ts: add `FeatureGrid` to import + `layoutBlocks`.
- block-schemas.ts: add `FeatureGrid` to import + `REGISTERED_BLOCKS`.
- page-builder.ts union: `| ({ blockType: 'featureGrid' } & Record<string, unknown>)`
- RenderBlocks.tsx: `import FeatureGridBlock from './FeatureGrid';` and case:

```tsx
    case 'featureGrid':
      return <FeatureGridBlock {...asProps<ComponentProps<typeof FeatureGridBlock>>(block)} />;
```

- [ ] **Step 7: Run test + typecheck**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/feature-grid.test.tsx`
Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/page-builder/feature-icons.ts src/payload/blocks/FeatureGrid.ts components/blocks/FeatureGrid.tsx src/payload/blocks/index.ts src/payload/collections/Pages.ts lib/page-builder/block-schemas.ts lib/page-builder.ts components/blocks/RenderBlocks.tsx components/blocks/__tests__/feature-grid.test.tsx
git commit -m "feat(page-builder): feature list block with curated icons"
```

---

### Task 7: Regenerate types, generate migration, full verification

**Files:**
- Modify (generated): `src/payload/payload-types.ts`, the Payload import map
- Create (generated): `src/migrations/<timestamp>_block_expansion.ts` + `.json`

**Interfaces:** none produced; this task makes the schema runnable against the DB.

- [ ] **Step 1: Regenerate Payload types and import map**

Run: `node_modules/.bin/payload generate:types`
Run: `node_modules/.bin/payload generate:importmap`
Expected: `src/payload/payload-types.ts` now includes `PricingTableBlock`, `CountdownBlock`, `TabsBlock`, `FeatureGridBlock` interfaces and the new appearance fields; no errors.

- [ ] **Step 2: Check migration ledger BEFORE creating (drift guard)**

Run: `node_modules/.bin/payload migrate:status`
Expected: a table of applied/pending migrations. Note any pending ones — if the remote ledger is behind `src/migrations/`, **do not run `migrate` blindly**; report the state and confirm before applying.

- [ ] **Step 3: Generate the migration**

Run: `node_modules/.bin/payload migrate:create block_expansion`
Expected: a new pair of files under `src/migrations/`. This command connects to `DATABASE_URL` to diff the schema.

- [ ] **Step 4: Hand-review the generated SQL**

Read the generated `src/migrations/<timestamp>_block_expansion.ts`. Verify the `up()`:
- CREATEs tables for the 4 new blocks (`pages_blocks_pricing_table`, `pages_blocks_countdown`, `pages_blocks_tabs`, `pages_blocks_feature_grid`) and their nested array tables (tiers, features, items).
- ADDs the appearance columns (`content_align`, `rounded`, `border`, `max_width_custom`, `animate`) and the `custom` enum value on `container_width` to **every** existing block table.
- Contains **no `DROP TABLE` / `DROP COLUMN`** on existing data columns. If it proposes destructive drops (a sign of pre-existing drift), STOP and report — do not apply.

- [ ] **Step 5: Full test suite + typecheck**

Run: `node_modules/.bin/vitest run`
Run: `node_modules/.bin/tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/payload/payload-types.ts src/migrations/ app/\(payload\)/admin/importMap.js
git commit -m "feat(page-builder): regenerate types + migration for new blocks and appearance fields"
```

(Adjust the import-map path to wherever `generate:importmap` wrote — check `git status`.)

- [ ] **Step 7: Apply the migration (gated)**

The migration runs against the **remote** `DATABASE_URL`. Per the drift constraint, surface the `migrate:status` result from Step 2 and get a go-ahead before running:

Run (only once confirmed): `node_modules/.bin/payload migrate`
Expected: the new migration applies cleanly. Verify a page using a new block renders without a `42P01` error.

---

## Self-Review

**Spec coverage:**
- Pricing Table → Task 3 ✓ · Countdown → Task 4 ✓ · Tabs/Accordion (one block, variant) → Task 5 ✓ · Feature List w/ icons → Task 6 ✓
- Content alignment → Task 1 ✓ · Rounded+border → Task 1 ✓ · Custom max-width → Task 1 ✓ · Scroll animation (Option A RevealOnScroll) → Task 2 ✓
- Migration + drift handling → Task 7 ✓ · Tests per block + appearance helper → each task ✓ · AI assistant auto-registration → block-schemas `REGISTERED_BLOCKS` edits in Tasks 3-6 ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓

**Type consistency:** `BlockAppearance` extended once (Task 1) with `animate` included so Task 2 needs no type change; `computeRemaining` signature identical in component and test; `blockAppearanceClasses` return shape `{section, container, style}` unchanged. New `PageBlock` union members and `RenderBlocks` cases use matching slugs (`pricingTable`, `countdown`, `tabs`, `featureGrid`). ✓

**Note on shared-file edits:** Tasks 3-6 all touch `index.ts`, `Pages.ts`, `RenderBlocks.tsx`, `block-schemas.ts`, `lib/page-builder.ts`. Executed sequentially the edits are purely additive — no conflict — but a parallel run would collide, so run Tasks 3-6 in series.
