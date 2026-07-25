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
});
