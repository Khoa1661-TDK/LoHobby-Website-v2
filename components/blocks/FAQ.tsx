// components/blocks/FAQ.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type FAQItem = {
  question: string;
  answer?: { root?: { children?: unknown } } | string | null;
};

type Props = {
  title?: string | null;
  items?: FAQItem[] | null;
  layout?: 'accordion' | 'twoCol' | null;
} & BlockAppearance;

export default function FAQBlock(props: Props): ReactElement {
  const { title, items, layout = 'accordion' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!items || items.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No FAQ items — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  // Extract plain text from rich text answer
  const answerText = (answer: FAQItem['answer']): string => {
    if (typeof answer === 'string') return answer;
    if (
      typeof answer === 'object' &&
      answer !== null &&
      'root' in answer
    ) {
      try {
        return extractTextFromLexical(answer);
      } catch {
        return 'See details above.';
      }
    }
    return '';
  };

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}

        <div
          className={
            layout === 'twoCol'
              ? 'grid gap-6 md:grid-cols-2'
              : 'mx-auto max-w-2xl space-y-4'
          }
        >
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-line"
            >
              <summary className="cursor-pointer px-5 py-4 font-medium text-ink list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                {item.question}
                <svg
                  className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-5 pb-4 text-sm text-ink/60">
                {answerText(item.answer)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function extractTextFromLexical(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;

  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text;
  }

  if (Array.isArray(n.children)) {
    return n.children.map(extractTextFromLexical).join(' ');
  }

  return '';
}