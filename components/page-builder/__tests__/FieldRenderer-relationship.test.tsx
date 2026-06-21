/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

afterEach(() => vi.restoreAllMocks());

const productsSchema: BlockSchema = {
  slug: 'featuredProducts',
  label: 'Featured Products',
  fields: [{ name: 'products', type: 'relationship', relationTo: 'products', hasMany: true }],
};

const limitSchema: BlockSchema = {
  slug: 'recommendations',
  label: 'Recommendations',
  fields: [{ name: 'limit', type: 'number' }],
};

describe('FieldRenderer relationship + number', () => {
  it('should add an id to the value when a product is picked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ docs: [{ id: 7, title: 'Bench Plate' }] }),
    } as Response);
    const onChange = vi.fn();
    render(<FieldRenderer schema={productsSchema} values={{ products: [] }} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add product'));
    const result = await screen.findByText('Bench Plate');
    fireEvent.click(result);
    expect(onChange).toHaveBeenCalledWith('products', ['7']);
  });

  it('should emit a number when the number input changes', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={limitSchema} values={{ limit: 8 }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith('limit', 12);
  });
});
