import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FeatureGridBlock from '@/components/blocks/FeatureGrid';

describe('FeatureGridBlock', () => {
  it('should render null with no items', () => {
    expect(FeatureGridBlock({ items: [] })).toBeNull();
  });

  it('should render titles, text and an icon svg when provided', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'zap', title: 'Fast', text: 'Quick prints' }]} />,
    );
    expect(html).toContain('Fast');
    expect(html).toContain('Quick prints');
    expect(html).toContain('<svg');
  });

  it('should skip an unknown icon name without crashing', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'nonsense', title: 'Still ok' }]} />,
    );
    expect(html).toContain('Still ok');
  });
});
