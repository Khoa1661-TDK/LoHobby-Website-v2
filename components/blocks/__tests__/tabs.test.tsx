import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TabsBlock from '@/components/blocks/Tabs';

describe('TabsBlock', () => {
  it('should render nothing with no items', () => {
    expect(renderToStaticMarkup(<TabsBlock items={[]} />)).toBe('');
  });

  it('should render a tablist with all labels in tabs variant', () => {
    const html = renderToStaticMarkup(
      <TabsBlock variant="tabs" items={[{ label: 'One' }, { label: 'Two' }]} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('One');
    expect(html).toContain('Two');
  });

  it('should render expandable buttons in accordion variant', () => {
    const html = renderToStaticMarkup(
      <TabsBlock variant="accordion" items={[{ label: 'Q1' }]} />,
    );
    expect(html).toContain('aria-expanded');
    expect(html).toContain('Q1');
  });
});
