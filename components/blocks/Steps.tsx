// components/blocks/Steps.tsx — numbered how-it-works steps.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Step = {
  title?: string | null;
  body?: string | null;
};

type Props = {
  heading?: string | null;
  steps?: Step[] | null;
} & BlockAppearance;

export default function StepsBlock(props: Props): ReactElement {
  const { heading, steps } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!steps || steps.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No steps — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-10 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-filament-500 font-display text-sm font-bold text-white">
                {i + 1}
              </span>
              {step.title ? (
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                  {step.title}
                </h3>
              ) : null}
              {step.body ? (
                <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{step.body}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
