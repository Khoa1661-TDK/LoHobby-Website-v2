import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RevealOnScroll from '@/components/animations/RevealOnScroll';

describe('RevealOnScroll', () => {
  it('should render children visible on the server (no opacity-0 lock without JS)', () => {
    const html = renderToStaticMarkup(
      <RevealOnScroll animate="fade-up" blockType="richText">
        <p>hello world</p>
      </RevealOnScroll>,
    );
    expect(html).toContain('hello world');
    expect(html).not.toContain('opacity-0');
    expect(html).not.toContain('opacity:0');
  });

  it('should render children when animation is none', () => {
    const html = renderToStaticMarkup(
      <RevealOnScroll animate="none" blockType="spacer">
        <p>instant</p>
      </RevealOnScroll>,
    );
    expect(html).toContain('instant');
  });

  it('should render children for a legacy stored value', () => {
    const html = renderToStaticMarkup(
      <RevealOnScroll animate="reveal-up" blockType="text">
        <p>legacy</p>
      </RevealOnScroll>,
    );
    expect(html).toContain('legacy');
  });
});
