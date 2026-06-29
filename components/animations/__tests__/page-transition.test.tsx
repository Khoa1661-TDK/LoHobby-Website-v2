import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PageTransition from '@/components/animations/PageTransition';

describe('PageTransition', () => {
  it('should render children visible on the server (no opacity-0 lock without JS)', () => {
    const html = renderToStaticMarkup(
      <PageTransition>
        <p>page content</p>
      </PageTransition>,
    );
    expect(html).toContain('page content');
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('opacity: 0');
  });
});
