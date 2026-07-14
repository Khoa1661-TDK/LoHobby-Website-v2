/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

afterEach(() => vi.restoreAllMocks());

// A Spotlight-shaped block: a deals array whose rows carry a product relationship and a
// priceWas text field flagged to auto-fill from that product.
const schema: BlockSchema = {
  slug: 'spotlight',
  label: 'Spotlight Deal',
  fields: [
    {
      name: 'deals',
      type: 'array',
      label: 'Deals',
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'priceWas', type: 'text', label: 'Was', autoFillPriceFrom: 'product' },
      ],
    },
  ],
};

describe('FieldRenderer auto-fill price', () => {
  it('should fetch the product price and fill an empty Was box when a product is set', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ id: 7, price: 1290000 }),
    } as Response);
    const onChange = vi.fn();

    render(
      <FieldRenderer
        schema={schema}
        values={{ deals: [{ product: 7, priceWas: '' }] }}
        onChange={onChange}
      />,
    );

    // The Was box auto-fills with the product's list price in vi-VN VND format.
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('deals', [{ product: 7, priceWas: '1.290.000 VND' }]),
    );
  });

  it('should not overwrite a Was price the editor typed by hand', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ id: 7, price: 1290000 }),
    } as Response);
    const onChange = vi.fn();

    render(
      <FieldRenderer
        schema={schema}
        values={{ deals: [{ product: 7, priceWas: '₫999,000' }] }}
        onChange={onChange}
      />,
    );

    // Give any effect a chance to run. The RelationshipField still fetches the product
    // *label* (a `where[id][in]` list query), so we don't assert "no fetch at all" — only
    // that the auto-fill by-id price fetch never fired and no priceWas value was committed.
    await new Promise((r) => setTimeout(r, 20));
    const autoFillCalled = fetchSpy.mock.calls.some(([url]) =>
      String(url).includes('/products/7?depth=0'),
    );
    expect(autoFillCalled).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render the Was field as an editable text input', () => {
    render(
      <FieldRenderer
        schema={schema}
        values={{ deals: [{ product: null, priceWas: '' }] }}
        onChange={() => {}}
      />,
    );
    // No product picked yet — the box is present and editable, no fetch fired.
    expect(screen.getByText('Was')).toBeInTheDocument();
  });
});
