// components/console/settings/BrandPanel.tsx
//
// "Cửa hàng & thương hiệu" panel (board 17): the store logo slot, two form
// field slots (one full width, one at 60%), and the brand colour swatches.
// The controls are read-only — writes stay in the Payload admin for now.
//
// The swatch colours are inline styles because they are DATA read from the
// store-settings global, not design tokens; the no-inline-colour rule covers
// the palette, not values a user picked in the CMS.

import type { BrandFacts } from '@/lib/console/settings';

export function BrandPanel({ facts }: { facts: BrandFacts }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-[18px] font-bold leading-none text-[var(--adm-ink)]">
        Cửa hàng &amp; thương hiệu
      </div>
      <div className="flex gap-4">
        <div className="h-[100px] w-[100px] flex-none bg-[var(--adm-placeholder)]">
          {facts.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={facts.logoUrl}
              alt={facts.logoAlt}
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex h-9 items-center truncate border border-[var(--adm-line)] px-2.5 text-[12px] text-[var(--adm-ink)]">
            {facts.storeName}
          </div>
          <div className="flex h-9 w-[60%] items-center truncate border border-[var(--adm-line)] px-2.5 text-[12px] text-[var(--adm-ink-3)]">
            {facts.storeSubtitle}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="h-8 w-8" style={{ backgroundColor: facts.colors.primary }} />
        <div
          className="h-8 w-8 border border-[var(--adm-line)]"
          style={{ backgroundColor: facts.colors.secondary }}
        />
        <div className="h-8 w-8" style={{ backgroundColor: facts.colors.accent }} />
      </div>
    </div>
  );
}
