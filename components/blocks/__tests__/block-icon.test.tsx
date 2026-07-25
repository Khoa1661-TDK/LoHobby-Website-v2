import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BlockIcon, { ICON_COMPONENTS } from '@/components/blocks/_icon';
import { BLOCK_ICON_NAMES, LEGACY_ICON_ALIASES } from '@/lib/page-builder/icons';
import type { BlockIconName } from '@/lib/page-builder/icons';

describe('BlockIcon', () => {
  it('should have a component for every name in the registry', () => {
    for (const name of BLOCK_ICON_NAMES) {
      expect(ICON_COMPONENTS[name]).toBeDefined();
    }
  });

  it('should resolve every legacy alias', () => {
    for (const [legacy, modern] of Object.entries(LEGACY_ICON_ALIASES)) {
      // LEGACY_ICON_ALIASES is typed Record<string, string> (Task 4); the value is
      // guaranteed by construction to be a BLOCK_ICON_NAMES member, so assert it here
      // rather than widening ICON_COMPONENTS's key type back to string.
      expect(ICON_COMPONENTS[modern as BlockIconName]).toBeDefined();
      const { container } = render(<BlockIcon name={legacy} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('should render an svg for a known name', () => {
    const { container } = render(<BlockIcon name="truck" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should render nothing for an unknown name', () => {
    const { container } = render(<BlockIcon name="not-a-real-icon" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when the name is absent', () => {
    const { container } = render(<BlockIcon name={null} />);
    expect(container.innerHTML).toBe('');
  });
});
