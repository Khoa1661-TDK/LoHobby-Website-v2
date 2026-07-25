// components/blocks/CustomHtml.tsx — renders admin-authored markup for the customHtml block.
// Both the markup and the CSS are sanitized here, at render time, so tightening the rules in
// sanitize-html.ts also protects rows already stored in the database.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { sanitizeBlockHtml, scopeBlockCss } from '@/lib/page-builder/sanitize-html';
import { newBlockKey } from '@/lib/page-builder/default-block';

type Props = {
  id?: string | null;
  blockKey?: string | null;
  html?: string | null;
  css?: string | null;
} & BlockAppearance;

export default function CustomHtmlBlock(props: Props): ReactElement | null {
  const { blockKey, id, html, css } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const cleanHtml = sanitizeBlockHtml(html ?? '');
  if (!cleanHtml.trim()) return null;

  // Payload's own block `id` is stripped on every locale save and is absent entirely on a
  // freshly-added, not-yet-saved block (src/payload/blocks/_identity.ts) — so it cannot be
  // trusted as the CSS-scoping identity. `blockKey` is the field that exists specifically to
  // survive that stripping, so it takes priority. If a row somehow has neither (content
  // authored outside the builder, predating the blockKey field), fall back to a fresh random
  // token (reusing the same generator the builder uses to mint `blockKey` in the first
  // place, `lib/page-builder/default-block.ts`) rather than a shared literal — two such
  // blocks must still scope to different selectors instead of one's CSS bleeding into the
  // other's markup.
  const scopeId = blockKey || id || newBlockKey();
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
