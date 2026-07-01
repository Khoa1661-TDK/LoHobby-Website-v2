import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarqueeBlock from '@/components/blocks/Marquee';

describe('MarqueeBlock', () => {
  it('should render null when no phrases are provided', () => {
    expect(MarqueeBlock({ items: [] })).toBeNull();
    expect(MarqueeBlock({ items: [{ text: '  ' }] })).toBeNull();
  });

  it('should render each phrase twice for a seamless loop', () => {
    const html = renderToStaticMarkup(
      <MarqueeBlock items={[{ text: 'Free shipping' }, { text: 'Fast dispatch' }]} />,
    );
    // One visible track + one aria-hidden duplicate => two occurrences each.
    expect(html.split('Free shipping').length - 1).toBe(2);
    expect(html.split('Fast dispatch').length - 1).toBe(2);
  });

  it('should paint the brand strip by default and honor an explicit background', () => {
    const def = renderToStaticMarkup(<MarqueeBlock items={[{ text: 'Hi' }]} />);
    expect(def).toContain('bg-accent');
    const dark = renderToStaticMarkup(<MarqueeBlock items={[{ text: 'Hi' }]} background="dark" />);
    expect(dark).not.toContain('bg-accent');
  });

  it('should map speed to a marquee duration custom property', () => {
    const fast = renderToStaticMarkup(<MarqueeBlock items={[{ text: 'Hi' }]} speed="fast" />);
    expect(fast).toContain('22s');
  });
});
