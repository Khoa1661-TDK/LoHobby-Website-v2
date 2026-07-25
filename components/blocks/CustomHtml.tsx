// components/blocks/CustomHtml.tsx — renders admin-authored markup for the customHtml block.
// Both the markup and the CSS are sanitized here, at render time, so tightening the rules in
// sanitize-html.ts also protects rows already stored in the database.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { sanitizeBlockHtml, scopeBlockCss } from '@/lib/page-builder/sanitize-html';

type Props = {
  id?: string | null;
  html?: string | null;
  css?: string | null;
} & BlockAppearance;

export default function CustomHtmlBlock(props: Props): ReactElement | null {
  const { id, html, css } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const cleanHtml = sanitizeBlockHtml(html ?? '');
  if (!cleanHtml.trim()) return null;

  const scopeId = id ?? 'custom-html';
  const cleanCss = css ? scopeBlockCss(css, scopeId) : '';

  return (
    // `relative` and `isolate` are load-bearing, not cosmetic: sanitize-html.ts rewrites
    // `position: fixed` to `absolute`, which only contains the element if this wrapper is a
    // containing block. Without them, `position:absolute; inset:0; width:100vw` inside the
    // block is still a full-page overlay — i.e. the clickjacking defense is worth nothing.
    <section
      className={`relative isolate ${section}`}
      style={style}
      data-html-block={scopeId}
    >
      {cleanCss ? <style>{cleanCss}</style> : null}
      <div className={container} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
    </section>
  );
}
