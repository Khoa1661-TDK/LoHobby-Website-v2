/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

describe('FieldRenderer checkbox', () => {
  const schema: BlockSchema = {
    slug: 'productShowcase',
    label: 'Product Showcase',
    fields: [{ name: 'showTabs', type: 'checkbox', defaultValue: true }],
  };

  it('should render a checkbox (not the deferred placeholder) for a checkbox field', () => {
    render(<FieldRenderer schema={schema} values={{ showTabs: true }} onChange={() => {}} />);
    expect(screen.queryByText(/editable in a later phase/i)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('should commit the toggled boolean through onChange', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={schema} values={{ showTabs: true }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('showTabs', false);
  });
});

describe('FieldRenderer date', () => {
  const schema: BlockSchema = {
    slug: 'promoBanner',
    label: 'Promo Banner',
    fields: [{ name: 'countdown', type: 'date' }],
  };

  it('should render a date input (not the deferred placeholder)', () => {
    render(<FieldRenderer schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.queryByText(/editable in a later phase/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).toBeInTheDocument();
  });

  it('should commit an ISO string through onChange', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={schema} values={{}} onChange={onChange} />);
    const input = document.querySelector('input[type="datetime-local"]')!;
    fireEvent.change(input, { target: { value: '2026-07-01T12:00' } });
    const [, committed] = onChange.mock.calls[0]!;
    // Committed as an ISO string equal to the local datetime the user picked.
    expect(committed).toBe(new Date('2026-07-01T12:00').toISOString());
  });
});

describe('FieldRenderer group', () => {
  const schema: BlockSchema = {
    slug: 'infoSection',
    label: 'Info Section',
    fields: [
      {
        name: 'contact',
        type: 'group',
        fields: [
          { name: 'phone', type: 'text' },
          { name: 'email', type: 'text' },
        ],
      },
    ],
  };

  it('should render nested sub-fields (not the deferred placeholder)', () => {
    render(
      <FieldRenderer
        schema={schema}
        values={{ contact: { phone: '0123', email: 'a@b.c' } }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/editable in a later phase/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('0123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@b.c')).toBeInTheDocument();
  });

  it('should commit the merged group object through onChange', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        schema={schema}
        values={{ contact: { phone: '0123', email: 'a@b.c' } }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('0123'), { target: { value: '0999' } });
    expect(onChange).toHaveBeenCalledWith('contact', { phone: '0999', email: 'a@b.c' });
  });
});
