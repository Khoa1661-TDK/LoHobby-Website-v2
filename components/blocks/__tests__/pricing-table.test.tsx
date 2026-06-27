import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PricingTableBlock from '@/components/blocks/PricingTable';

describe('PricingTableBlock', () => {
  it('should render null when there are no tiers', () => {
    expect(PricingTableBlock({ tiers: [] })).toBeNull();
  });

  it('should render heading, tier name, price and features', () => {
    const html = renderToStaticMarkup(
      <PricingTableBlock
        heading="Plans"
        tiers={[
          { name: 'Pro', price: '$9', period: 'mo', features: [{ text: 'Unlimited prints' }], highlighted: true },
        ]}
      />,
    );
    expect(html).toContain('Plans');
    expect(html).toContain('Pro');
    expect(html).toContain('$9');
    expect(html).toContain('Unlimited prints');
  });
});
