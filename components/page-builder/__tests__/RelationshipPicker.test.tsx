/// <reference types="vitest" />
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RelationshipPicker from '@/components/page-builder/RelationshipPicker';

afterEach(() => vi.restoreAllMocks());

function mockFetchOnce(docs: { id: string | number; title?: string }[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ docs }),
  } as unknown as Response);
}

describe('RelationshipPicker', () => {
  it('should query the products REST endpoint and list results', async () => {
    const fetchSpy = mockFetchOnce([{ id: 7, title: 'Bench Plate' }]);
    render(<RelationshipPicker relationTo="products" onSelect={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Bench Plate')).toBeInTheDocument());
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/admin/api/products');
  });

  it('should call onSelect with the chosen item', async () => {
    mockFetchOnce([{ id: 7, title: 'Bench Plate' }]);
    const onSelect = vi.fn();
    render(<RelationshipPicker relationTo="products" onSelect={onSelect} onClose={() => {}} />);
    const button = await screen.findByText('Bench Plate');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith({ id: 7, title: 'Bench Plate' });
  });
});
