import { describe, expect, it } from 'vitest';
import {
  PRESETS,
  OBSERVER_CONFIG,
  normalizePreset,
  reduceMotion,
} from '@/lib/animations/config';
import { BLOCK_DEFAULTS, resolveBlockPreset } from '@/lib/animations/block-defaults';

describe('animation presets (config.ts)', () => {
  it('should define all 7 spec presets with keyframes, duration and easing', () => {
    const names = [
      'fade-up',
      'fade-in',
      'slide-right',
      'scale-in',
      'stagger-cards',
      'stagger-list',
      'hero-entrance',
    ] as const;
    for (const name of names) {
      const preset = PRESETS[name];
      expect(preset, name).toBeDefined();
      expect(preset.keyframes.opacity).toEqual([0, 1]);
      expect(preset.duration).toBeGreaterThan(0);
      expect(preset.easing).toBeTruthy();
    }
  });

  it('should match spec durations for key presets', () => {
    expect(PRESETS['fade-up'].duration).toBe(0.6);
    expect(PRESETS['scale-in'].duration).toBe(0.4);
    expect(PRESETS['hero-entrance'].duration).toBe(0.8);
  });

  it('should give stagger presets a per-child interval', () => {
    expect(PRESETS['stagger-cards'].staggerChildren).toBe(0.08);
    expect(PRESETS['stagger-list'].staggerChildren).toBe(0.06);
  });

  it('should use the spec IntersectionObserver config', () => {
    expect(OBSERVER_CONFIG.rootMargin).toBe('0px 0px -10% 0px');
    expect(OBSERVER_CONFIG.threshold).toBe(0.05);
  });
});

describe('reduceMotion', () => {
  it('should collapse duration to 0 and strip transform keyframes', () => {
    const reduced = reduceMotion(PRESETS['hero-entrance']);
    expect(reduced.duration).toBe(0);
    expect(reduced.keyframes.transform).toBeUndefined();
    expect(reduced.keyframes.opacity).toEqual([0, 1]);
    expect(reduced.staggerChildren).toBeUndefined();
  });
});

describe('normalizePreset', () => {
  it('should map legacy values to their new presets', () => {
    expect(normalizePreset('reveal-up')).toBe('fade-up');
    expect(normalizePreset('reveal-right')).toBe('slide-right');
  });

  it('should pass valid preset names through', () => {
    expect(normalizePreset('scale-in')).toBe('scale-in');
    expect(normalizePreset('none')).toBe('none');
  });

  it('should return null for unknown or empty values', () => {
    expect(normalizePreset(null)).toBeNull();
    expect(normalizePreset(undefined)).toBeNull();
    expect(normalizePreset('wobble')).toBeNull();
  });
});

describe('resolveBlockPreset (block-defaults.ts)', () => {
  it('should map every known block type to a defined preset', () => {
    for (const [blockType, preset] of Object.entries(BLOCK_DEFAULTS)) {
      // 'none' has no PRESETS entry by design; all others must exist.
      if (preset !== 'none') {
        expect(PRESETS[preset], blockType).toBeDefined();
      }
    }
  });

  it('should follow the block-type default when value is "default" or null', () => {
    expect(resolveBlockPreset('hero', 'default')).toBe('hero-entrance');
    expect(resolveBlockPreset('featuredProducts', null)).toBe('stagger-cards');
    expect(resolveBlockPreset('faq', undefined)).toBe('stagger-list');
  });

  it('should honour an explicit preset override over the block default', () => {
    expect(resolveBlockPreset('hero', 'fade-in')).toBe('fade-in');
  });

  it('should resolve legacy stored values via aliasing', () => {
    expect(resolveBlockPreset('text', 'reveal-up')).toBe('fade-up');
  });

  it('should fall back to fade-up for an unknown block type', () => {
    expect(resolveBlockPreset('mysteryBlock', 'default')).toBe('fade-up');
  });
});
