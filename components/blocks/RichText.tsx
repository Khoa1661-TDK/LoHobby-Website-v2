// components/blocks/RichText.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  content?: { root?: { children?: unknown } } | string | null;
  textAlign?: 'left' | 'center' | null;
} & BlockAppearance;

export default function RichTextBlock(props: Props): ReactElement {
  const { textAlign = 'left' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const alignClass = textAlign === 'center' ? 'text-center' : 'text-left';

  // Render Lexical richText as raw HTML for now — Payload provides the rendered HTML
  // via the REST API. Server components receive the structured JSON.
  const rawContent = props.content;

  if (!rawContent) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-warm-500">
            No content — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  // Handle lexical rich text JSON — render a simple text extraction
  // For full rich text rendering, leverage Payload's serializeLexical or convert to HTML
  let htmlContent: string | null = null;

  if (typeof rawContent === 'string') {
    htmlContent = rawContent;
  } else if (
    typeof rawContent === 'object' &&
    rawContent !== null &&
    'root' in rawContent
  ) {
    // Extract text from Lexical JSON as a fallback
    try {
      htmlContent = extractTextFromLexical(rawContent);
    } catch {
      htmlContent = null;
    }
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div
          className={`prose prose-warm max-w-none dark:prose-invert ${alignClass}`}
          {...(htmlContent
            ? { dangerouslySetInnerHTML: { __html: htmlContent } }
            : {})}
        >
          {!htmlContent ? (
            <p className="text-sm text-warm-500">Unsupported content format.</p>
          ) : null}
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