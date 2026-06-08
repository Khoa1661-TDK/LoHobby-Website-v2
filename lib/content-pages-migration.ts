// lib/content-pages-migration.ts — pure mappers for the one-time content-pages → pages migration.

export type LexicalText = {
  type: 'text';
  detail: 0;
  format: 0;
  mode: 'normal';
  style: '';
  text: string;
  version: 1;
};

export type LexicalParagraph = {
  type: 'paragraph';
  children: LexicalText[];
  direction: 'ltr';
  format: '';
  indent: 0;
  version: 1;
};

export type LexicalState = {
  root: {
    type: 'root';
    children: LexicalParagraph[];
    direction: 'ltr';
    format: '';
    indent: 0;
    version: 1;
  };
};

/** Convert a plain (textarea) string into a minimal Lexical editor state. */
export function plainTextToLexical(input: string): LexicalState {
  const lines = input.length > 0 ? input.split('\n') : [''];
  const children: LexicalParagraph[] = lines.map((line) => ({
    type: 'paragraph',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: line, version: 1 },
    ],
  }));
  return {
    root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
  };
}

type RawBlock = Record<string, unknown> & { blockType?: string };

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Map one content-pages block to a pages block object, or null if unmappable. */
export function mapContentBlock(block: RawBlock): Record<string, unknown> | null {
  switch (block.blockType) {
    case 'hero':
      return {
        blockType: 'hero',
        headline: typeof block.headline === 'string' ? block.headline : '',
        subheadline: str(block.subheadline),
        ctaLabel: str(block.ctaLabel),
        ctaHref: str(block.ctaHref),
        // `image` is an upload relation: keep the id (number) or relation object as-is.
        image: block.image ?? undefined,
      };
    case 'richText':
      return {
        blockType: 'richText',
        content: plainTextToLexical(typeof block.content === 'string' ? block.content : ''),
      };
    case 'cta': {
      const title = typeof block.title === 'string' ? block.title : '';
      const body = str(block.body);
      return {
        blockType: 'promoBanner',
        text: body ? `${title} — ${body}` : title,
        ctaLabel: str(block.buttonLabel),
        ctaHref: str(block.buttonHref),
      };
    }
    default:
      return null;
  }
}

export type MappedPage = {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  layout: Record<string, unknown>[];
};

/** Map a full content-pages doc to the `pages` collection create shape. */
export function mapContentPageToPageData(doc: {
  title: unknown;
  slug: unknown;
  published: unknown;
  layout: unknown;
}): MappedPage {
  const rawLayout = Array.isArray(doc.layout) ? doc.layout : [];
  const layout = rawLayout
    .filter((b): b is RawBlock => typeof b === 'object' && b !== null)
    .map(mapContentBlock)
    .filter((b): b is Record<string, unknown> => b !== null);

  return {
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    status: doc.published === true ? 'published' : 'draft',
    layout,
  };
}
