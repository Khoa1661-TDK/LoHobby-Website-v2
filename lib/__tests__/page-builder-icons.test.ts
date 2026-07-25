import { describe, expect, it } from 'vitest';
import {
  BLOCK_ICON_NAMES,
  BLOCK_ICON_OPTIONS,
  LEGACY_ICON_ALIASES,
} from '@/lib/page-builder/icons';
import { FEATURE_ICON_NAMES, FEATURE_ICON_OPTIONS } from '@/lib/page-builder/feature-icons';

describe('block icon registry', () => {
  it('should expose at least 60 icon names', () => {
    expect(BLOCK_ICON_NAMES.length).toBeGreaterThanOrEqual(60);
  });

  it('should contain no duplicate names', () => {
    expect(new Set(BLOCK_ICON_NAMES).size).toBe(BLOCK_ICON_NAMES.length);
  });

  it('should use kebab-case names only', () => {
    for (const name of BLOCK_ICON_NAMES) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('should produce one select option per name', () => {
    expect(BLOCK_ICON_OPTIONS).toHaveLength(BLOCK_ICON_NAMES.length);
    for (const option of BLOCK_ICON_OPTIONS) {
      expect(BLOCK_ICON_NAMES).toContain(option.value);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it('should keep every legacy feature-grid icon resolvable, directly or via an alias', () => {
    for (const name of FEATURE_ICON_NAMES) {
      const resolved = LEGACY_ICON_ALIASES[name] ?? name;
      expect(BLOCK_ICON_NAMES).toContain(resolved);
    }
  });

  it('should keep the legacy feature-grid exports intact', () => {
    expect(FEATURE_ICON_NAMES).toHaveLength(16);
    expect(FEATURE_ICON_OPTIONS).toHaveLength(16);
    expect(FEATURE_ICON_NAMES[0]).toBe('zap');
  });
});
