import { describe, expect, it } from 'vitest';
import { sanitizeBlockHtml, scopeBlockCss } from '@/lib/page-builder/sanitize-html';

describe('sanitizeBlockHtml', () => {
  it('should strip script tags and their contents', () => {
    const out = sanitizeBlockHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain('ok');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('<script');
  });

  it('should strip inline event handlers', () => {
    const out = sanitizeBlockHtml('<img src="/media/a.png" onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('should strip javascript: hrefs', () => {
    const out = sanitizeBlockHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('should force rel="noopener noreferrer" on target="_blank" links', () => {
    const out = sanitizeBlockHtml('<a href="https://evil.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('should strip iframes', () => {
    expect(sanitizeBlockHtml('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe');
  });

  it('should keep layout markup, classes and inline styles', () => {
    const out = sanitizeBlockHtml(
      '<section class="hero" style="padding:4rem"><h1>Hi</h1><p>Body</p></section>',
    );
    expect(out).toContain('<section');
    expect(out).toContain('class="hero"');
    expect(out).toContain('padding');
    expect(out).toContain('<h1>Hi</h1>');
  });

  it('should keep inline svg', () => {
    const out = sanitizeBlockHtml('<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>');
    expect(out).toContain('<svg');
    expect(out).toContain('viewBox');
    expect(out).toContain('<path');
  });

  it('should keep root-relative and https image sources', () => {
    const out = sanitizeBlockHtml('<img src="/media/a.png"><img src="https://cdn.test/b.png">');
    expect(out).toContain('/media/a.png');
    expect(out).toContain('https://cdn.test/b.png');
  });

  it('should drop data-uri sources', () => {
    const out = sanitizeBlockHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">');
    expect(out).not.toContain('data:text/html');
  });

  // The block-level CSS field (scopeBlockCss) rewrites `position: fixed` and drops
  // off-origin/data: url() so a rule cannot escape the block or phone home. An inline
  // `style="..."` attribute on the pasted markup is a second way to reach the exact same
  // declarations and must be held to the same rule, or the CSS-field protections are moot.
  it('should rewrite fixed position in an inline style attribute', () => {
    const out = sanitizeBlockHtml('<div style="position:fixed;top:0;left:0">overlay</div>');
    expect(out).toContain('position:absolute');
    expect(out).not.toContain('fixed');
  });

  it('should drop off-origin url() from an inline style attribute', () => {
    const out = sanitizeBlockHtml(
      '<div style="background:url(https://evil.test/beacon.png)">x</div>',
    );
    expect(out).not.toContain('evil.test');
  });

  it('should drop data-uri url() from an inline style attribute', () => {
    const out = sanitizeBlockHtml('<div style="background:url(data:image/png;base64,AAAA)">x</div>');
    expect(out).not.toContain('data:image');
  });

  it('should not throw and should drop the attribute for a malformed inline style', () => {
    expect(() => sanitizeBlockHtml('<div style="color: rgb(">x</div>')).not.toThrow();
    const out = sanitizeBlockHtml('<div style="color: rgb(">x</div>');
    expect(out).toContain('x');
  });
});

describe('scopeBlockCss', () => {
  it('should prefix every selector with the block attribute', () => {
    const out = scopeBlockCss('.card { color: red; }', 'abc');
    expect(out).toBe('[data-html-block="abc"] .card { color: red; }');
  });

  it('should prevent a body rule from affecting the page', () => {
    const out = scopeBlockCss('body { display: none; }', 'abc');
    expect(out).toContain('[data-html-block="abc"]');
    expect(out).not.toMatch(/^\s*body\s*\{/);
  });

  it('should scope every selector in a comma-separated list', () => {
    const out = scopeBlockCss('h1, h2 { margin: 0; }', 'abc');
    expect(out).toContain('[data-html-block="abc"] h1');
    expect(out).toContain('[data-html-block="abc"] h2');
  });

  it('should scope selectors inside a media query', () => {
    const out = scopeBlockCss('@media (min-width: 40rem) { .g { display: grid; } }', 'abc');
    expect(out).toContain('@media');
    expect(out).toContain('[data-html-block="abc"] .g');
  });

  it('should namespace keyframe names so two blocks cannot collide', () => {
    const a = scopeBlockCss('@keyframes fade { to { opacity: 1 } } .x { animation: fade 1s }', 'a');
    const b = scopeBlockCss('@keyframes fade { to { opacity: 0 } } .x { animation: fade 1s }', 'b');
    expect(a).toContain('fade-a');
    expect(b).toContain('fade-b');
    expect(a).not.toContain('fade-b');
  });

  it('should drop @import rules', () => {
    const out = scopeBlockCss('@import url("https://evil.test/x.css"); .a { color: red }', 'abc');
    expect(out).not.toContain('@import');
  });

  it('should drop off-origin url() references', () => {
    const out = scopeBlockCss('.a { background: url("https://evil.test/x.png") }', 'abc');
    expect(out).not.toContain('evil.test');
  });

  it('should rewrite position fixed to absolute', () => {
    const out = scopeBlockCss('.a { position: fixed; top: 0 }', 'abc');
    expect(out).toContain('position: absolute');
    expect(out).not.toContain('fixed');
  });

  it('should return an empty string for unparseable css rather than throwing', () => {
    expect(scopeBlockCss('.a { color: ', 'abc')).toBe('');
  });

  // --- Findings from the 2026-07-26 security review ---

  // Finding 1: CSS at-rule names are ASCII case-insensitive; `@IMPORT` is exactly as
  // effective as `@import`. The fix moved from denylisting `import` to allowlisting the
  // at-rules this module has reviewed, so the comparison itself must be non-canonical here.
  it('should drop an @import rule regardless of case', () => {
    const out = scopeBlockCss('@IMPORT url("https://evil.test/x.css"); .a { color: red }', 'abc');
    expect(out.toLowerCase()).not.toContain('@import');
    expect(out).not.toContain('evil.test');
  });

  it('should drop at-rules outside the reviewed allowlist (e.g. @page)', () => {
    const out = scopeBlockCss('@page { margin: 0 } .a { color: red }', 'abc');
    expect(out).not.toContain('@page');
    expect(out).toContain('[data-html-block="abc"] .a');
  });

  // Finding 2: a selector beginning with a sibling/adjacent combinator is invalid at the
  // top level of a stylesheet, but postcss's tokenizer accepts it anyway. Naively
  // prefixing `~ *` as `${scope} ~ *` manufactures a *valid* selector that hides every
  // sibling following the block. Only a leading `>` is safe to keep (it stays inside the
  // block); any other leading combinator must drop that selector, not get scoped.
  it('should drop a rule whose selector opens with a sibling combinator', () => {
    const out = scopeBlockCss('~ * { display: none } .safe { color: red }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
    expect(out).toContain('[data-html-block="abc"] .safe');
  });

  it('should drop a rule whose selector opens with an adjacent-sibling combinator', () => {
    const out = scopeBlockCss('+ footer { display: none }', 'abc');
    expect(out).toBe('');
  });

  // Finding 3: `position`/`fixed`/`behavior` are CSS keywords and property names, which
  // are ASCII case-insensitive; `POSITION: Fixed` must be rewritten exactly like
  // `position: fixed`. Likewise an uppercase `BODY` selector must collapse to the scope
  // exactly like lowercase `body` (this is what let `BODY { display: none }` through).
  it('should rewrite position:fixed to absolute regardless of casing', () => {
    const out = scopeBlockCss('.a { POSITION: Fixed; top: 0 }', 'abc');
    expect(out.toLowerCase()).toContain('position: absolute');
    expect(out.toLowerCase()).not.toContain('fixed');
  });

  it('should collapse an uppercase BODY selector to the scope like lowercase body', () => {
    const out = scopeBlockCss('BODY { display: none; }', 'abc');
    // Must collapse to the bare scope, identically to `body { … }` — not become
    // `[data-html-block="abc"] BODY`, a descendant selector that (case-insensitively,
    // per CSS) still matches the real page <body> and never matches inside the block.
    expect(out).toBe(scopeBlockCss('body { display: none; }', 'abc'));
  });

  // Finding 4: the old off-origin check only recognized the literal `url(` token, so it
  // missed `image-set()`, a CSS-escape-encoded scheme inside `url()`, and a URL parked
  // behind a `var()` reference it cannot resolve statically. The fix parses the value
  // and allowlists the root-relative shape rather than denylisting known-bad syntax.
  it('should drop a background using image-set() instead of url()', () => {
    const out = scopeBlockCss('.a { background: image-set("https://evil.test/x.png" 1x) }', 'abc');
    expect(out).not.toContain('evil.test');
  });

  it('should drop a url() whose CSS escape decodes to an off-origin scheme', () => {
    const out = scopeBlockCss('.a { background: url(\\68 ttps://evil.test/x.png) }', 'abc');
    expect(out).not.toContain('evil.test');
  });

  it('should drop an image-set() argument that cannot be resolved statically (var())', () => {
    const out = scopeBlockCss('.a { background: image-set(var(--u) 1x) }', 'abc');
    expect(out).not.toContain('var(--u)');
  });

  it('should keep a root-relative url() reference', () => {
    const out = scopeBlockCss('.a { background: url(/media/x.png) }', 'abc');
    expect(out).toContain('/media/x.png');
  });

  // Finding 5: `postcss.parse` succeeds on selector text that `postcss-selector-parser`
  // cannot tokenize (e.g. an unmatched paren) — the try/catch around `postcss.parse`
  // alone doesn't cover this, so it threw at render time instead of degrading safely.
  it('should not throw, and should drop the offending rule, when a selector confuses the selector parser', () => {
    expect(() => scopeBlockCss('.a) { color: red }', 'abc')).not.toThrow();
    expect(scopeBlockCss('.a) { color: red }', 'abc')).toBe('');
  });

  // Finding 6: this output is inlined into a literal <style> element by the renderer.
  // postcss's own stringifier happens to escape characters that would otherwise close
  // that tag early, but that guarantee lives in a devDependency semver range, not in
  // anything this module asserts — belt-and-braces it explicitly.
  it('should not allow </style> to survive in content that would close the wrapping <style> tag', () => {
    const out = scopeBlockCss('.a::after{content:"</style><img src=x onerror=alert(1)>"}', 'x');
    expect(out.toLowerCase()).not.toContain('</style');
  });

  // --- Findings from the 2026-07-26 re-review ---

  // Still open — Important 5: the Finding-4 fix introduced a new throw path.
  // `decodeCssEscapes` called `String.fromCodePoint` on a 1-6 hex digit escape, which
  // can encode a value above U+10FFFF — a RangeError that escaped uncaught because only
  // `valueParser(value)` was wrapped in try/catch, not the `.walk()` that reaches
  // `decodeCssEscapes`. Every repro below must not throw, through both exports.
  it('should not throw for a url() containing an out-of-range hex escape', () => {
    expect(() => scopeBlockCss('.a{background:url(\\ffffff)}', 'abc')).not.toThrow();
  });

  it('should not throw for a quoted url() argument with an out-of-range escape one past the boundary', () => {
    // 0x110000 is exactly one past U+10FFFF, the top of the Unicode range.
    expect(() => scopeBlockCss('.a{background:url("\\110000")}', 'abc')).not.toThrow();
  });

  it('should not throw for an out-of-range escape embedded mid-path in an otherwise-valid url()', () => {
    expect(() => scopeBlockCss('.a{background:url(/x\\ffffff.png)}', 'abc')).not.toThrow();
  });

  it('should not throw for an out-of-range escape inside a custom property', () => {
    expect(() => scopeBlockCss('.a{--x: url(\\ffffff)}', 'abc')).not.toThrow();
  });

  it('should not throw for an out-of-range escape inside an image-set() string argument', () => {
    expect(() => scopeBlockCss('.a{background:image-set("\\ffffff" 1x)}', 'abc')).not.toThrow();
  });

  it('should not throw for an out-of-range escape reached via an inline style attribute', () => {
    expect(() =>
      sanitizeBlockHtml('<div style="background:url(\\ffffff)">x</div>'),
    ).not.toThrow();
  });

  // New regression — fragment URLs (`url(#...)`) were silently dropped. A fragment can't
  // leave the document, so it carries none of the off-origin risk the root-relative
  // restriction exists for — and sanitizeBlockHtml explicitly keeps inline <svg>, whose
  // fill/stroke/filter routinely reference a same-document gradient/mask/filter by id.
  it('should keep a url(#...) fragment reference in a filter declaration', () => {
    const out = scopeBlockCss('.a{filter:url(#blur)}', 'abc');
    expect(out).toContain('#blur');
  });

  it('should keep a url(#...) fragment reference in a clip-path declaration', () => {
    const out = scopeBlockCss('.a{clip-path:url(#mask)}', 'abc');
    expect(out).toContain('#mask');
  });

  it('should keep a quoted url("#...") fragment reference in a fill declaration', () => {
    const out = scopeBlockCss('.a{fill:url("#grad")}', 'abc');
    expect(out).toContain('#grad');
  });

  it('should keep an inline SVG style attribute that references a same-document fragment', () => {
    const out = sanitizeBlockHtml('<svg><path style="fill:url(#g)" d="M0 0h24"/></svg>');
    expect(out).toContain('fill:url(#g)');
  });

  // Also close, since Finding 3 said "throughout" — `decl.prop === 'animation'` was still
  // compared raw, so an uppercase ANIMATION declaration kept pointing at the un-renamed
  // keyframe name after @keyframes itself was namespaced.
  //
  // `toContain('fade-abc')` alone does not discriminate: the renamed `@keyframes fade-abc`
  // rule supplies that substring regardless of whether the ANIMATION declaration itself
  // got rewritten. Assert on the declaration's own text so the buggy behavior (prop
  // comparison left un-lowercased, so `ANIMATION: fade 1s` is never touched) fails this.
  it('should rewrite an ANIMATION reference to the namespaced keyframe name regardless of property casing', () => {
    const out = scopeBlockCss('@keyframes fade { to { opacity: 1 } } .x{ANIMATION: fade 1s}', 'abc');
    expect(out).toContain('ANIMATION: fade-abc');
  });

  // Deferred `blockId` interpolation, now confirmed reachable in principle: `blockId` is
  // spliced directly into `[data-html-block="..."]` and into the renamed @keyframes name.
  // A crafted id can close the attribute selector early and append a fully unscoped rule.
  // Not reachable today (blockId comes from an auto-generated blockKey), but one line
  // fixes it, so it shouldn't sit open.
  it('should not let a malicious blockId escape the attribute selector', () => {
    const malicious = '"] , * {display:none} [x="';
    const out = scopeBlockCss('.a{color:red}', malicious);
    expect(out).not.toContain('*');
    expect(out).not.toMatch(/display:\s*none/);
  });

  // Important — `scopeBlockCss`'s own body was still only guarded around `postcss.parse`.
  // `postcss.parse` succeeds on CSS nested thousands of `@media` levels deep; it's
  // `root.toString()` — postcss's stringifier recurses once per nesting level — that
  // overflows the call stack, well outside the original try/catch. Depth 3000 reliably
  // throws in this environment (1000 is fine); picked with margin above that threshold.
  it('should not throw on CSS nested thousands of levels deep (stringifier stack overflow)', () => {
    const depth = 3000;
    const deeplyNested = '@media (min-width:1px){'.repeat(depth) + '.a{color:red}' + '}'.repeat(depth);
    expect(() => scopeBlockCss(deeplyNested, 'abc')).not.toThrow();
  });

  // --- Findings from the final whole-branch review ---

  // Fix 1: `*` was lumped into ROOT_SELECTORS alongside `html`/`body`/`:root` and
  // collapsed to the bare scope, narrowing a universal reset to match only the wrapper
  // element instead of everything inside the block. `*` needs both the scope itself and
  // every descendant, since `${scope} *` alone excludes the wrapper.
  it('should scope a universal-selector rule to the block and its descendants, not collapse it to the wrapper alone', () => {
    const out = scopeBlockCss('* { box-sizing: border-box; margin: 0 }', 'abc');
    expect(out).toBe('[data-html-block="abc"], [data-html-block="abc"] * { box-sizing: border-box; margin: 0 }');
  });

  // Fix 2: a rule nested inside another rule (native CSS nesting) was still routed through
  // the same scoping pass as its parent, so it got prefixed a second time even though its
  // parent selector is already scoped. `[data-html-block="abc"] .a{ [data-html-block="abc"]
  // &:hover{...} }` is an invalid selector — browsers drop the whole nested rule.
  it('should leave a natively-nested rule unscoped since its parent selector is already scoped', () => {
    const out = scopeBlockCss('.a{ &:hover{color:red} }', 'abc');
    expect(out).toBe('[data-html-block="abc"] .a{ &:hover{color:red} }');
  });

  // Fix 3: renaming an `animation`/`animation-name` reference to the namespaced keyframe
  // only rewrote the value's very first whitespace-separated token. A name that isn't
  // first (`1s fade`) or that appears in a later comma-separated entry (`fade 1s, slide
  // 2s`) kept pointing at the un-renamed keyframe and silently stopped animating.
  // Asserting only that the output contains `fade-abc`/`slide-abc` would not discriminate:
  // the renamed `@keyframes` rules themselves supply those substrings regardless of
  // whether the `animation` declaration got rewritten — so assert on the declaration text.
  // `out.split('\n').find(line => line.includes('.x'))` used to stand in for "narrow to the
  // declaration", but `scopeBlockCss` preserves the single-line input raws, so that line IS
  // the whole output — the narrowing was a no-op that only looked reassuring. Assert on the
  // declaration text directly instead: `animation: 1s fade-abc` cannot be supplied by the
  // renamed `@keyframes fade-abc` rule, so it still discriminates against the first-token-
  // only bug the way the (imagined) line narrowing was meant to.
  it('should rewrite a keyframe reference that is not the first token in the animation shorthand', () => {
    const out = scopeBlockCss(
      '@keyframes fade { to { opacity: 1 } } .x{animation: 1s fade}',
      'abc',
    );
    expect(out).toContain('animation: 1s fade-abc');
  });

  it('should rewrite every entry of a comma-separated animation list, not only the first', () => {
    const out = scopeBlockCss(
      '@keyframes fade { to { opacity: 1 } } @keyframes slide { to { transform: none } } ' +
        '.x{animation: fade 1s, slide 2s}',
      'abc',
    );
    expect(out).toContain('animation: fade-abc 1s, slide-abc 2s');
  });

  // Fix 4: the inline `style` attribute path reconstructed each declaration as
  // `${prop}: ${value}`, discarding `!important` — the block-level CSS path preserves it,
  // so the two halves of the sanitizer disagreed on fidelity.
  it('should preserve !important on an inline style declaration', () => {
    const out = sanitizeBlockHtml('<div style="color:red !important">x</div>');
    expect(out).toContain('color:red !important');
  });

  // --- Findings from the nested-selector review of the "skip nested rules" fix ---
  //
  // Critical: skipping every rule whose parent is a rule also routed nested rules around
  // `prefixSelector`'s leading-combinator guard. CSS nesting makes a relative selector legal
  // where the top-level form is rejected, so `~ *` — dropped outright at the top level —
  // sailed through as `body { ~ * { … } }`. When the parent selector collapses to the bare
  // scope (`html`/`body`/`:root`/`*`), `&` IS the block wrapper, and a sibling combinator
  // walks straight out of the block. `position: fixed` → `absolute` does not contain these:
  // the matched element sits outside the wrapper, so the wrapper is not its containing block.
  //
  // Every assertion below is on the emitted selector text: no sibling/adjacent combinator
  // may survive anywhere in the output, and the escaping declaration must be gone with it.

  it('should drop a nested sibling-combinator rule under a body parent', () => {
    const out = scopeBlockCss('body{ ~ *{display:none} }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
  });

  it('should drop an explicit `& ~ *` overlay nested under a body parent', () => {
    const out = scopeBlockCss('body{ & ~ *{position:fixed;inset:0;z-index:99999} }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toContain('z-index');
    expect(out).not.toContain('inset');
  });

  it('should drop a nested adjacent-sibling rule under an uppercase BODY parent', () => {
    const out = scopeBlockCss('BODY{ + *{display:none} }', 'abc');
    expect(out).not.toContain('+');
    expect(out).not.toMatch(/display:\s*none/);
  });

  it('should drop a nested sibling-combinator rule under a :root parent', () => {
    const out = scopeBlockCss(':root{ & ~ *{opacity:0} }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toContain('opacity');
  });

  it('should drop a nested sibling-combinator rule under a universal-selector parent', () => {
    const out = scopeBlockCss('*{ ~ *{display:none} }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
    // The universal parent itself must still be scoped the way Fix 1 of the previous round
    // established — dropping the nested rule must not disturb it.
    expect(out).toContain('[data-html-block="abc"], [data-html-block="abc"] *');
  });

  it('should drop a nested rule that puts a compound before the sibling combinator', () => {
    // `&:hover ~ *` — a guard that only looks at a *leading* combinator does not catch this.
    const out = scopeBlockCss('html{ &:hover ~ *{display:none} }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
  });

  it('should drop a nested sibling-combinator rule inside a media query', () => {
    const out = scopeBlockCss('@media (min-width:1px){ body{ ~ *{display:none} } }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
    expect(out).toContain('@media');
  });

  it('should drop a sibling-combinator rule nested inside an at-rule inside a body rule', () => {
    // The Fix 2 path: `rule.parent.type` is 'atrule' here, so the "is my parent a rule?"
    // test only sees this once it walks up through at-rule ancestors — and the guard has
    // to apply on that path too, or Fix 2 opens the escape Fix 1 just closed.
    const out = scopeBlockCss('body{ @media (min-width:1px){ ~ *{display:none} } }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
  });

  it('should drop a sibling-combinator rule nested two levels under a body rule', () => {
    // `&` in the middle rule still resolves to the wrapper, so the innermost sibling
    // combinator escapes exactly as it does one level up.
    const out = scopeBlockCss('body{ & { ~ *{display:none} } }', 'abc');
    expect(out).not.toContain('~');
    expect(out).not.toMatch(/display:\s*none/);
  });

  // Contained, and must stay that way: `.a` is scoped to a descendant of the wrapper, so
  // the siblings of `.a` are inside the block too. This is the case a blanket "drop every
  // nested sibling combinator" guard would have cost.
  it('should keep a nested sibling-combinator rule whose parent is an ordinary class', () => {
    const out = scopeBlockCss('.a{ ~ *{color:red} }', 'abc');
    expect(out).toBe('[data-html-block="abc"] .a{ ~ *{color:red} }');
  });

  // Ordinary nesting must still pass through unprefixed — the parent's selector already
  // carries the scope and `&` inherits it.
  it('should leave `& .x` nesting unprefixed', () => {
    expect(scopeBlockCss('.a{ & .x{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"] .a{ & .x{color:red} }',
    );
  });

  it('should leave `.x &` nesting unprefixed', () => {
    expect(scopeBlockCss('.a{ .x &{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"] .a{ .x &{color:red} }',
    );
  });

  it('should leave `&&` nesting unprefixed', () => {
    expect(scopeBlockCss('.a{ &&{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"] .a{ &&{color:red} }',
    );
  });

  it('should leave implicit-& nesting unprefixed', () => {
    expect(scopeBlockCss('.a{ .b{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"] .a{ .b{color:red} }',
    );
  });

  it('should leave three-level nesting unprefixed below the outermost rule', () => {
    expect(scopeBlockCss('.a{ .b{ &:hover{color:red} } }', 'abc')).toBe(
      '[data-html-block="abc"] .a{ .b{ &:hover{color:red} } }',
    );
  });

  it('should leave ordinary nesting under a body parent unprefixed and scoped', () => {
    expect(scopeBlockCss('body{ &:hover{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"]{ &:hover{color:red} }',
    );
    expect(scopeBlockCss('body{ > .x{color:red} }', 'abc')).toBe(
      '[data-html-block="abc"]{ > .x{color:red} }',
    );
  });

  // Minor: a rule nested inside an `@media` that is itself inside a rule has
  // `parent.type === 'atrule'`, so the "parent is a rule" test missed it and the rule was
  // prefixed a second time — `[scope] .a{ @media(…){ [scope] &:hover{…} } }`, which bolts a
  // redundant scope ancestor onto an already-scoped nested selector.
  it('should not prefix a nested rule a second time through an intervening at-rule', () => {
    const out = scopeBlockCss('.a{ @media (min-width:1px){ &:hover{color:red} } }', 'abc');
    expect(out).toBe('[data-html-block="abc"] .a{ @media (min-width:1px){ &:hover{color:red} } }');
  });

  // The no-throw contract must survive on the changed path too.
  it('should not throw on thousands of levels of rule-in-rule nesting', () => {
    const depth = 3000;
    const nested = '.a{'.repeat(depth) + 'color:red' + '}'.repeat(depth);
    expect(() => scopeBlockCss(nested, 'abc')).not.toThrow();
    expect(scopeBlockCss(nested, 'abc')).toBe('');
  });

  it('should not throw for an unterminated rule', () => {
    expect(() => scopeBlockCss('.a{color:red', 'abc')).not.toThrow();
    expect(scopeBlockCss('.a{color:red', 'abc')).toBe('');
  });

  it('should not throw, and should fail closed, for an unmatched paren in a nested selector', () => {
    // The selector parser cannot tokenize `.b)`, so the nested guard cannot verify this
    // rule — under a wrapper-anchored parent it must drop the rule rather than pass it
    // through, the same fail-closed choice the top-level path already makes.
    expect(() => scopeBlockCss('body{ .b) ~ *{color:red} }', 'abc')).not.toThrow();
    expect(scopeBlockCss('body{ .b) ~ *{color:red} }', 'abc')).not.toContain('~');
    expect(() => scopeBlockCss('.a{ &:is(.b ~ *{color:red} }', 'abc')).not.toThrow();
  });
});
