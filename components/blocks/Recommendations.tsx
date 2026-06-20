// components/blocks/Recommendations.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  title?: string | null;
  limit?: number | null;
} & BlockAppearance;

export default function RecommendationsBlock({ title, limit = 8 }: Props): ReactElement {
  const { section, container } = blockAppearanceClasses({ background: 'theme' });
  return (
    <section className={section}>
      <div className={container}>
        {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
        <p className="text-sm text-ink/60">Personalized recommendations for {limit} items (client-side)</p>
      </div>
    </section>
  );
}