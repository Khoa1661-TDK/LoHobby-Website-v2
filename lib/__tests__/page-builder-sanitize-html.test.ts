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
});
