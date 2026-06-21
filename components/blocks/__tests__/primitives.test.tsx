/// <reference types="vitest" />
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpecTag, BuildPlateGrid, LayerLineDivider } from '../_primitives';

describe('block primitives', () => {
  it('should render SpecTag content in a mono label', () => {
    const { getByText } = render(<SpecTag>PLA · 0.2mm</SpecTag>);
    const el = getByText('PLA · 0.2mm');
    expect(el.className).toContain('font-mono');
  });

  it('should mark BuildPlateGrid decorative', () => {
    const { container } = render(<BuildPlateGrid />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render a layer-line divider element', () => {
    const { container } = render(<LayerLineDivider />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
