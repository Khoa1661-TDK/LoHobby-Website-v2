// lib/page-builder/sanitize-html.ts — server-side sanitizing for the customHtml block.
// Runs at RENDER time, not save time, so tightening these rules also protects markup that
// is already stored. No `import 'server-only'` — lib/page-builder.ts is client-imported and
// this module sits in the same directory tree.
//
// CSS at-rule names, property names, and keywords are all ASCII case-insensitive, and
// postcss preserves the author's original casing rather than normalizing it. Every
// comparison against one of those in this module must therefore be done on a
// lowercased copy — `@IMPORT`, `POSITION: FIXED`, and `BODY {}` are exactly as
// effective as their lowercase spellings.
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import sanitizeHtml from 'sanitize-html';
import valueParser from 'postcss-value-parser';

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

/** Function names that can carry a remote or scheme-bearing reference. Checked
 *  case-insensitively — CSS functional-notation names are ASCII case-insensitive. */
const URL_BEARING_FUNCTIONS = new Set(['url', 'image-set', '-webkit-image-set', 'src']);

/** Decode CSS escape sequences (`\68` → `h`, consuming the optional single trailing
 *  whitespace terminator) so a value like `url(\68 ttps://evil.test/x.png)` is judged on
 *  what it actually resolves to (`https://evil.test/x.png`), not its literal source text.
 *
 *  A 1-6 hex digit escape can encode a value above U+10FFFF (the top of the Unicode
 *  range) — `String.fromCodePoint` throws a `RangeError` for those rather than clamping.
 *  Per CSS Syntax §4.3.7, an out-of-range escape resolves to U+FFFD REPLACEMENT
 *  CHARACTER, not a parse failure, so that's what this returns instead of throwing. This
 *  function must never throw: it runs inside a sanitizer, at render time, over
 *  attacker-influenced input. */
function decodeCssEscapes(raw: string): string {
  return raw.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\(.)/g, (_match, hex: string, char: string) => {
    if (!hex) return char;
    const codePoint = parseInt(hex, 16);
    return codePoint > 0x10ffff ? String.fromCharCode(0xfffd) : String.fromCodePoint(codePoint);
  });
}

/** The only URL shapes this module trusts: a single leading `/` (root-relative on this
 *  origin), or a same-document fragment (`#...`, used by `fill: url(#gradient-id)` /
 *  `filter: url(#blur)` — routine with the inline `<svg>` this module's HTML half
 *  explicitly supports). A fragment can't leave the document, so it carries none of the
 *  off-origin/beacon risk the `/` restriction exists for. Protocol-relative (`//`), any
 *  scheme (`https:`, `data:`, …), and anything we can't resolve statically are all
 *  rejected — allowlisting the shape rather than trying to enumerate every dangerous
 *  scheme/syntax combination. */
function isSafeUrlShape(rawArgument: string): boolean {
  const unquoted = rawArgument.trim().replace(/^['"]|['"]$/g, '');
  const decoded = decodeCssEscapes(unquoted).trim();
  return (decoded.startsWith('/') && !decoded.startsWith('//')) || decoded.startsWith('#');
}

/** Inspect one `url()`/`image-set()`/-prefixed/`src()` function node and collect its
 *  candidate path arguments. For `url()` the single unquoted word IS the path. For the
 *  multi-entry functions (`image-set(...)`), only quoted `string` nodes are candidate
 *  paths — bare words there are resolution descriptors (`1x`, `2x`), not URLs. A nested
 *  function (most notably `var(--custom-property)`) means the real value can't be
 *  determined statically, so it fails closed rather than being treated as safe. */
function collectPathCandidates(fnNode: valueParser.FunctionNode): { resolvable: boolean; paths: string[] } {
  const isUrlFn = fnNode.value.toLowerCase() === 'url';
  const paths: string[] = [];
  let resolvable = true;
  for (const node of fnNode.nodes) {
    if (node.type === 'string') {
      paths.push(node.value);
    } else if (node.type === 'word' && isUrlFn) {
      paths.push(node.value);
    } else if (node.type === 'function') {
      resolvable = false;
    }
  }
  return { resolvable, paths };
}

/** Replaces the old `url\(...\)` regex, which only recognized the literal `url(` token
 *  and missed `image-set()`, a CSS-escape-encoded scheme inside `url()`, and a URL parked
 *  behind an unresolvable `var()` reference. Parses the declaration value and rejects any
 *  url-bearing function whose argument isn't a verified safe shape (see `isSafeUrlShape`).
 *
 *  The whole body — parsing *and* walking — is one try/catch. `decodeCssEscapes` (reached
 *  via `isSafeUrlShape` during the walk) previously could throw on an out-of-range escape,
 *  and only the parse step was guarded, so that throw escaped uncaught. Catching the
 *  entire operation means this function can never throw for *any* reason, known or not —
 *  the no-throw contract holds structurally, not by enumerating every cause. */
function hasUnsafeUrlReference(value: string): boolean {
  try {
    const parsed = valueParser(value);
    let unsafe = false;
    parsed.walk((node) => {
      if (node.type !== 'function') return;
      if (!URL_BEARING_FUNCTIONS.has(node.value.toLowerCase())) return;
      const { resolvable, paths } = collectPathCandidates(node);
      if (!resolvable || paths.length === 0 || !paths.every(isSafeUrlShape)) {
        unsafe = true;
      }
    });
    return unsafe;
  } catch {
    return true; // can't verify it statically — fail closed
  }
}

/** Shared by the inline `style` attribute and the block-level `<style>`/CSS field: neither
 *  may escape the block visually (fixed overlays) or phone home (off-origin/data: url()). */
function neutralizeDecl(decl: postcss.Declaration): void {
  const prop = decl.prop.toLowerCase();
  if (prop === 'position' && decl.value.trim().toLowerCase() === 'fixed') {
    decl.value = 'absolute';
  }
  if (hasUnsafeUrlReference(decl.value)) {
    decl.remove();
    return;
  }
  if (/expression\s*\(/i.test(decl.value) || prop === 'behavior') decl.remove();
}

/** Run an inline `style="..."` attribute value through the same declaration-level rules as
 *  `scopeBlockCss`. Without this, `style="position:fixed"` on a single element would bypass
 *  every protection the CSS-field scoping builds in. Returns '' (attribute dropped) on
 *  unparseable input, same failure mode as `scopeBlockCss`.
 *
 *  The whole body is one try/catch, not just the parse. `rule.walkDecls(neutralizeDecl)`
 *  reaches `hasUnsafeUrlReference`/`decodeCssEscapes`, which previously could throw on a
 *  malformed or out-of-range escape while only the parse step was guarded — the throw
 *  reached `sanitizeBlockHtml`'s caller uncaught. Attribute dropped on any failure here,
 *  same fail-closed outcome as an unparseable value. */
function sanitizeStyleAttribute(value: string): string {
  try {
    const root = postcss.parse(`a{${value}}`);
    const rule = root.first;
    if (!rule || rule.type !== 'rule') return '';
    rule.walkDecls(neutralizeDecl);
    return rule.nodes
      .filter((node): node is postcss.Declaration => node.type === 'decl')
      .map((decl) => `${decl.prop}: ${decl.value}`)
      .join('; ');
  } catch {
    return '';
  }
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
 *  descendant of it — `body { … }` scoped naively would never match anything. Compared
 *  lowercase: `BODY {}` is exactly as effective as `body {}`. */
const ROOT_SELECTORS = new Set(['html', 'body', ':root', '*']);

/** Prefix each comma-separated selector with the scope. Returns `null` if every selector
 *  in the list had to be dropped — the caller removes the whole rule in that case.
 *
 *  A selector opening with a sibling/adjacent combinator (`~ *`, `+ footer`) is invalid at
 *  the top level of a stylesheet, but postcss's tokenizer accepts it anyway. Prefixing it
 *  naively (`${scope} ~ *`) manufactures a *valid* selector that reaches every following
 *  sibling of the block — an escape built out of invalid input. Only a leading `>` keeps
 *  the match inside the block (it restricts to the scope's direct children); any other
 *  leading combinator drops that selector instead of scoping it. */
function prefixSelector(selector: string, scope: string): string | null {
  const parts: string[] = [];
  selectorParser((root) => {
    root.each((sel) => {
      const first = sel.nodes[0];
      if (first && first.type === 'combinator' && first.value.trim() !== '>') {
        return; // e.g. `~ *`, `+ footer` — cannot be scoped safely, drop it
      }
      const text = sel.toString().trim();
      if (text) parts.push(text);
    });
  }).processSync(selector);

  if (parts.length === 0) return null;
  return parts
    .map((part) => (ROOT_SELECTORS.has(part.toLowerCase()) ? scope : `${scope} ${part}`))
    .join(', ');
}

/** At-rules this module has reviewed and knows how to scope safely. Everything else —
 *  `@import`, `@charset`, `@page`, `@namespace`, any at-rule feature not audited yet — is
 *  dropped. An allowlist means an at-rule we didn't anticipate is inert by default rather
 *  than a new hole: the previous denylist compared `atRule.name` to the literal string
 *  `'import'`, so `@IMPORT` (a case-insensitive match per the CSS spec) sailed through
 *  untouched, retaining a remotely-controlled, fully unscoped stylesheet. */
const ALLOWED_AT_RULES = new Set(['media', 'supports', 'keyframes', 'font-face', 'layer', 'container']);

function atRuleName(rule: postcss.AtRule): string {
  return rule.name.toLowerCase();
}

/** Belt-and-braces escape for the two sequences that would let attacker-controlled CSS
 *  close the literal `<style>` element this output is inlined into by the renderer
 *  (Task 8). postcss (>=8.4.31) already escapes `</style` and `<!--` in its own
 *  stringifier, but that guarantee lives in a devDependency semver range, not in
 *  anything this module asserts — a future postcss downgrade or a swap to a different
 *  CSS tool would silently reopen a stored-XSS breakout. This makes the guarantee this
 *  module's own, independent of what postcss happens to do. */
function escapeStyleTagBreakout(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style').replace(/<!--/g, '<\\!--');
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

  // 1. Drop every at-rule outside the reviewed allowlist (case-insensitively — see
  //    ALLOWED_AT_RULES above). This is what actually removes @import in any casing.
  root.walkAtRules((rule) => {
    if (!ALLOWED_AT_RULES.has(atRuleName(rule))) rule.remove();
  });

  // 2. Namespace @keyframes so two custom blocks on one page cannot collide.
  const renamedKeyframes = new Map<string, string>();
  root.walkAtRules((rule) => {
    if (atRuleName(rule) !== 'keyframes') return;
    const original = rule.params.trim();
    const renamed = `${original}-${blockId}`;
    renamedKeyframes.set(original, renamed);
    rule.params = renamed;
  });

  // 3. Scope every selector. `postcss.parse` tokenizes plenty of selector text that
  //    `postcss-selector-parser` cannot (e.g. an unmatched paren) — catch per-rule so one
  //    malformed selector degrades to "drop that rule," not an uncaught render-time throw.
  root.walkRules((rule) => {
    // Selectors inside @keyframes are percentages/from/to, not element selectors.
    if (rule.parent?.type === 'atrule' && atRuleName(rule.parent as postcss.AtRule) === 'keyframes') {
      return;
    }
    try {
      const scoped = prefixSelector(rule.selector, scope);
      if (scoped === null) {
        rule.remove();
        return;
      }
      rule.selector = scoped;
    } catch {
      rule.remove();
    }
  });

  // 4. Neutralise escaping declarations (shared with the inline `style` attribute path).
  root.walkDecls((decl) => {
    neutralizeDecl(decl);
    if (decl.parent === undefined) return; // decl.remove() already detached it above
    const renamed = renamedKeyframes.get(decl.value.split(/\s+/)[0] ?? '');
    // Property name comparison, lowercased — `ANIMATION: fade 1s` is exactly as live a
    // reference to the `fade` keyframe as `animation: fade 1s`, and must be rewritten to
    // the namespaced name just the same, or it keeps pointing at the un-renamed keyframe.
    const prop = decl.prop.toLowerCase();
    if ((prop === 'animation' || prop === 'animation-name') && renamed) {
      decl.value = decl.value.replace(/^\S+/, renamed);
    }
  });

  return escapeStyleTagBreakout(root.toString());
}
