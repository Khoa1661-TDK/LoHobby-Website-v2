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
    {
      name: 'backgroundCustomDark',
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

describe('FieldRenderer themed color slot', () => {
  it('should write to backgroundCustom in light mode', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '', backgroundCustomDark: '' }}
        onChange={onChange}
        themeMode="light"
      />,
    );
    fireEvent.change(screen.getByLabelText('Pick color'), { target: { value: '#ffffff' } });
    expect(onChange).toHaveBeenCalledWith('backgroundCustom', '#ffffff');
  });

  it('should write to backgroundCustomDark in dark mode', () => {
    const onChange = vi.fn();
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '#ffffff', backgroundCustomDark: '' }}
        onChange={onChange}
        themeMode="dark"
      />,
    );
    fireEvent.change(screen.getByLabelText('Pick color'), { target: { value: '#14181d' } });
    expect(onChange).toHaveBeenCalledWith('backgroundCustomDark', '#14181d');
  });

  it('should render only one color picker (dark slot is not a standalone field)', () => {
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '#fff', backgroundCustomDark: '#000' }}
        onChange={() => {}}
        themeMode="light"
      />,
    );
    expect(screen.getAllByLabelText('Pick color')).toHaveLength(1);
  });

  it('should show the inherit hint when the dark slot is empty', () => {
    render(
      <FieldRenderer
        schema={schema}
        values={{ background: 'custom', backgroundCustom: '#ffffff', backgroundCustomDark: '' }}
        onChange={() => {}}
        themeMode="dark"
      />,
    );
    expect(screen.getByText(/inherits the light color/i)).toBeInTheDocument();
  });
});
