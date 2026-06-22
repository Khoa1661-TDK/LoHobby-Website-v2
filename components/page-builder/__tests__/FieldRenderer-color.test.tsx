/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

// backgroundCustom is an appearance field, so it renders inside the collapsed
// "Appearance" <details>. The schema mirrors _appearance.ts.
const schema: BlockSchema = {
  slug: 'promoBanner',
  label: 'Promo Banner',
  fields: [
    {
      name: 'background',
      type: 'select',
      options: [
        { label: 'Theme (inherit)', value: 'theme' },
        { label: 'Custom color', value: 'custom' },
      ],
    },
    {
      name: 'backgroundCustom',
      type: 'text',
      condition: { field: 'background', equals: 'custom' },
    },
  ],
};

describe('FieldRenderer custom color', () => {
  it('should render a color swatch picker for the backgroundCustom field', () => {
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '#112233' }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('Pick color')).toHaveAttribute('type', 'color');
  });

  it('should commit the hex chosen from the swatch picker', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '' }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Pick color'), { target: { value: '#ff8800' } });
    expect(onChange).toHaveBeenCalledWith('backgroundCustom', '#ff8800');
  });

  it('should clear the value when Clear is pressed', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '#112233' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Clear color'));
    expect(onChange).toHaveBeenCalledWith('backgroundCustom', '');
  });
});
