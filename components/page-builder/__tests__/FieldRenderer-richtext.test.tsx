/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

const schema: BlockSchema = {
  slug: 'faq',
  label: 'FAQ',
  fields: [{ name: 'answer', type: 'richText' }],
};

describe('FieldRenderer richText', () => {
  it('should render a textarea (not the deferred placeholder) for a richText field', () => {
    render(<FieldRenderer schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.queryByText(/editable in a later phase/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should commit Lexical JSON through onChange', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={schema} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('answer', expect.objectContaining({ root: expect.any(Object) }));
  });
});