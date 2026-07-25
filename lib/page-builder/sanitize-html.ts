// lib/page-builder/sanitize-html.ts — server-side sanitizing for the customHtml block.
// Runs at RENDER time, not save time, so tightening these rules also protects markup that
// is already stored. No `import 'server-only'` — lib/page-builder.ts is client-imported and
// this module sits in the same directory tree.
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'section', 'div', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'small',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'cite', 'code', 'pre',
  'a', 'img', 'picture', 'source', 'figure', 'figcaption', 'br', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse',
];

const COMMON_ATTRS = ['class', 'id', 'style', 'title', 'role'];

const SVG_ATTRS = [
  'viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'points', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'rx', 'ry', 'width', 'height', 'transform', 'opacity',
];

const OFF_ORIGIN_URL = /url\(\s*['"]?(?:https?:)?\/\//i;
const DATA_URI = /url\(\s*['"]?data:/i;

/** Shared by the inline `style` attribute and the block-level `<style>`/CSS field: neither
 *  may escape the block visually (fixed overlays) or phone home (off-origin/data: url()). */
function neutralizeDecl(decl: postcss.Declaration): void {
  if (decl.prop === 'position' && decl.value.trim() === 'fixed') decl.value = 'absolute';
  if (OFF_ORIGIN_URL.test(decl.value) || DATA_URI.test(decl.value)) decl.remove();
  if (/expression\s*\(/i.test(decl.value) || decl.prop === 'behavior') decl.remove();
}

/** Run an inline `style="..."` attribute value through the same declaration-level rules as
 *  `scopeBlockCss`. Without this, `style="position:fixed"` on a single element would bypass
 *  every protection the CSS-field scoping builds in. Returns '' (attribute dropped) on
 *  unparseable input, same failure mode as `scopeBlockCss`. */
function sanitizeStyleAttribute(value: string): string {
  let root: postcss.Root;
  try {
    root = postcss.parse(`a{${value}}`);
  } catch {
    return '';
  }
  const rule = root.first;
  if (!rule || rule.type !== 'rule') return '';
  rule.walkDecls(neutralizeDecl);
  return rule.nodes
    .filter((node): node is postcss.Declaration => node.type === 'decl')
    .map((decl) => `${decl.prop}: ${decl.value}`)
    .join('; ');
}

/** Strip everything that can execute, phone home, or break out of the block. */
export function sanitizeBlockHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': [...COMMON_ATTRS, 'data-*', 'aria-*'],
      a: [...COMMON_ATTRS, 'href', 'target', 'rel'],
      img: [...COMMON_ATTRS, 'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
      source: [...COMMON_ATTRS, 'src', 'srcset', 'sizes', 'media', 'type'],
      svg: [...COMMON_ATTRS, ...SVG_ATTRS],
      path: [...COMMON_ATTRS, ...SVG_ATTRS],
      circle: [...COMMON_ATTRS, ...SVG_ATTRS],
      rect: [...COMMON_ATTRS, ...SVG_ATTRS],
      g: [...COMMON_ATTRS, ...SVG_ATTRS],
      line: [...COMMON_ATTRS, ...SVG_ATTRS],
      polyline: [...COMMON_ATTRS, ...SVG_ATTRS],
      polygon: [...COMMON_ATTRS, ...SVG_ATTRS],
      ellipse: [...COMMON_ATTRS, ...SVG_ATTRS],
      td: [...COMMON_ATTRS, 'colspan', 'rowspan'],
      th: [...COMMON_ATTRS, 'colspan', 'rowspan', 'scope'],
    },
    // Anything not listed here — javascript:, data:, vbscript: — is dropped with the attribute.
    allowedSchemes: ['https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'srcset'],
    allowProtocolRelative: false,
    // Drop the tag AND its text content for executable containers.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
    // sanitize-html strips on* handlers by virtue of the attribute allowlist above.
    // SVG attributes (viewBox, etc.) are case-sensitive — the underlying htmlparser2
    // lowercases attribute names by default, which would silently break inline SVG.
    parser: {
      lowerCaseAttributeNames: false,
    },
    // Inline style attributes carry the same escape risks as the CSS field (fixed overlays,
    // off-origin url() beacons) — run them through the same neutralization.
    transformTags: {
      '*': (tagName, attribs) => {
        if (attribs.style) {
          const cleaned = sanitizeStyleAttribute(attribs.style);
          if (cleaned) {
            attribs.style = cleaned;
          } else {
            delete attribs.style;
          }
        }
        // target="_blank" without rel="noopener noreferrer" lets the linked page reach
        // back via window.opener (reverse tabnabbing) — enforce it rather than trust
        // markup pasted from elsewhere to have included it.
        if (tagName === 'a' && attribs.target === '_blank') {
          attribs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs };
      },
    },
  });
}

/** Document-level selectors that must collapse to the scope itself rather than become a
 *  descendant of it — `body { … }` scoped naively would never match anything. */
const ROOT_SELECTORS = new Set(['html', 'body', ':root', '*']);

/** Prefix each comma-separated selector with the scope. The parser does the splitting so
 *  commas inside `:is(...)` / `:not(...)` are not mistaken for selector boundaries. */
function prefixSelector(selector: string, scope: string): string {
  const parts: string[] = [];
  selectorParser((root) => {
    root.each((sel) => {
      const text = sel.toString().trim();
      if (text) parts.push(text);
    });
  }).processSync(selector);

  if (parts.length === 0) return scope;
  return parts
    .map((part) => (ROOT_SELECTORS.has(part) ? scope : `${scope} ${part}`))
    .join(', ');
}

/** Prefix every selector with the block's data attribute so a rule cannot match outside
 *  its own section, and neutralise the declarations that can still escape it visually. */
export function scopeBlockCss(css: string, blockId: string): string {
  if (!css) return '';
  const scope = `[data-html-block="${blockId}"]`;

  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch {
    // Malformed CSS from an import or a hand edit — drop it rather than emitting garbage.
    return '';
  }

  // 1. Namespace @keyframes so two custom blocks on one page cannot collide.
  const renamedKeyframes = new Map<string, string>();
  root.walkAtRules('keyframes', (rule) => {
    const original = rule.params.trim();
    const renamed = `${original}-${blockId}`;
    renamedKeyframes.set(original, renamed);
    rule.params = renamed;
  });

  // 2. Drop @import outright — it is a remote fetch we do not control.
  root.walkAtRules('import', (rule) => {
    rule.remove();
  });

  // 3. Scope every selector.
  root.walkRules((rule) => {
    // Selectors inside @keyframes are percentages/from/to, not element selectors.
    if (rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'keyframes') {
      return;
    }
    rule.selector = prefixSelector(rule.selector, scope);
  });

  // 4. Neutralise escaping declarations (shared with the inline `style` attribute path).
  root.walkDecls((decl) => {
    neutralizeDecl(decl);
    if (decl.parent === undefined) return; // decl.remove() already detached it above
    const renamed = renamedKeyframes.get(decl.value.split(/\s+/)[0] ?? '');
    if ((decl.prop === 'animation' || decl.prop === 'animation-name') && renamed) {
      decl.value = decl.value.replace(/^\S+/, renamed);
    }
  });

  return root.toString();
}
