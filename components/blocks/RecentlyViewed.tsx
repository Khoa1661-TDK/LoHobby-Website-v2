// components/blocks/RecentlyViewed.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  title?: string | null;
  limit?: number | null;
} & BlockAppearance;

export default function RecentlyViewedBlock({ title, limit = 8 }: Props): ReactElement {
  const { section, container } = blockAppearanceClasses({ background: 'theme' });
  return (
    <section className={section}>
      <div className={container}>
        {title && <h2 className="mb-6 text-2xl font-bold">{title}</h2>}
        <p className="text-sm text-warm-500">Recently viewed items for {limit} items (client-side)</p>
      </div>
    </section>
  );
}