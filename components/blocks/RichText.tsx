// components/blocks/RichText.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { renderLexical } from './_primitives';

type Props = {
  content?: { root?: { children?: unknown } } | string | null;
  textAlign?: 'left' | 'center' | null;
} & BlockAppearance;

export default function RichTextBlock(props: Props): ReactElement {
  const { textAlign = 'left' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const alignClass = textAlign === 'center' ? 'text-center' : 'text-left';

  const rawContent = props.content;

  if (!rawContent) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No content — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  // Render Lexical rich text as React nodes via Payload's RichText component
  let content: React.ReactNode = null;

  if (typeof rawContent === 'string') {
    content = rawContent;
  } else if (
    typeof rawContent === 'object' &&
    rawContent !== null &&
    'root' in rawContent
  ) {
    content = renderLexical(rawContent as Record<string, unknown>);
  }

  if (!content) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-sm text-ink/60">Unsupported content format.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className={`prose dark:prose-invert max-w-none ${alignClass}`}>
          {content}
        </div>
      </div>
    </section>
  );
}