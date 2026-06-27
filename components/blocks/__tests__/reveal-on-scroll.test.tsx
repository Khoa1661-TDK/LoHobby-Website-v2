import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RevealOnScroll from '@/components/blocks/RevealOnScroll';

describe('RevealOnScroll', () => {
  it('should render children visible on the server (no opacity-0 lock without JS)', () => {
    const html = renderToStaticMarkup(
      <RevealOnScroll animate="reveal-up">
        <p>hello world</p>
      </RevealOnScroll>,
    );
    expect(html).toContain('hello world');
    expect(html).not.toContain('opacity-0');
  });
});
