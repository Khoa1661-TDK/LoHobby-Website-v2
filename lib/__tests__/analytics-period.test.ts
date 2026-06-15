// lib/__tests__/analytics-period.test.ts — unit tests for period resolution
import { describe, it, expect } from 'vitest';
import { resolvePeriod, previousPeriod } from '@/lib/analytics/period';

const NOW = new Date('2026-06-15T10:30:00.000Z');

describe('resolvePeriod', () => {
  it('should default to the current calendar month when no params are given', () => {
    const p = resolvePeriod({}, NOW);
    expect(p.key).toBe('month');
    expect(p.start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    // end is last ms of the month
    expect(p.end.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(p.end.getUTCDate()).toBe(30);
  });

  it('should resolve period=7d to a rolling 7-day window ending now', () => {
    const p = resolvePeriod({ period: '7d' }, NOW);
    expect(p.key).toBe('7d');
    expect(p.start.toISOString()).toBe('2026-06-09T00:00:00.000Z'); // 7 days inclusive of today
    expect(p.end.toISOString()).toBe('2026-06-15T23:59:59.999Z');
  });

  it('should resolve period=30d to a rolling 30-day window', () => {
    const p = resolvePeriod({ period: '30d' }, NOW);
    expect(p.start.toISOString()).toBe('2026-05-17T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-06-15T23:59:59.999Z');
  });

  it('should fall back to current month on an unknown period value', () => {
    const p = resolvePeriod({ period: 'bogus' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should resolve a valid custom from/to range', () => {
    const p = resolvePeriod({ from: '2026-03-01', to: '2026-03-31' }, NOW);
    expect(p.key).toBe('custom');
    expect(p.start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });

  it('should fall back to month when custom range is invalid (to before from)', () => {
    const p = resolvePeriod({ from: '2026-03-31', to: '2026-03-01' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should fall back to month when a custom date is unparseable', () => {
    const p = resolvePeriod({ from: 'not-a-date', to: '2026-03-01' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should fall back to month when custom range exceeds the 366-day cap', () => {
    const p = resolvePeriod({ from: '2024-01-01', to: '2026-01-01' }, NOW);
    expect(p.key).toBe('month');
  });
});

describe('previousPeriod', () => {
  it('should return the equally-long window immediately before the given one', () => {
    const p = resolvePeriod({ period: '7d' }, NOW); // 2026-06-09 .. 2026-06-15
    const prev = previousPeriod(p);
    expect(prev.end.getTime()).toBeLessThan(p.start.getTime());
    // same span (~7 days)
    const span = p.end.getTime() - p.start.getTime();
    expect(prev.end.getTime() - prev.start.getTime()).toBeCloseTo(span, -3);
  });
});