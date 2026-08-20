// lib/__tests__/console-format.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatVndSymbol,
  formatOrderCode,
  formatDayMonth,
  formatDateTime,
  formatPercent,
  formatCount,
} from '@/lib/console/format';

describe('formatVndSymbol', () => {
  it('should render grouped dong with the currency symbol when given an integer', () => {
    expect(formatVndSymbol(450000)).toBe('450.000 ₫');
  });

  it('should render zero dong when given null', () => {
    expect(formatVndSymbol(null)).toBe('0 ₫');
  });

  it('should render zero dong when given NaN', () => {
    expect(formatVndSymbol(Number.NaN)).toBe('0 ₫');
  });
});

describe('formatOrderCode', () => {
  it('should prefix the order id when given a numeric string', () => {
    expect(formatOrderCode('2031')).toBe('#DH-2031');
  });

  it('should prefix the order id when given a number', () => {
    expect(formatOrderCode(2031)).toBe('#DH-2031');
  });

  it('should render an em dash when the order id is missing', () => {
    expect(formatOrderCode(null)).toBe('—');
  });
});

describe('formatDayMonth', () => {
  it('should render day slash month in Ho Chi Minh time when given an ISO string', () => {
    // 02:14 UTC is 09:14 on the same day in UTC+7.
    expect(formatDayMonth('2026-08-20T02:14:00Z')).toBe('20/08');
  });

  it('should roll over to the next local day when the UTC time is late evening', () => {
    // 18:00 UTC on the 19th is 01:00 on the 20th in UTC+7.
    expect(formatDayMonth('2026-08-19T18:00:00Z')).toBe('20/08');
  });

  it('should render an em dash when given null', () => {
    expect(formatDayMonth(null)).toBe('—');
  });

  it('should render an em dash when given an unparseable string', () => {
    expect(formatDayMonth('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('should render the full local date and time when given an ISO string', () => {
    expect(formatDateTime('2026-08-20T02:14:00Z')).toBe('20/08/2026, 09:14');
  });

  it('should render an em dash when given null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('should render one decimal with a comma separator by default', () => {
    expect(formatPercent(7.6)).toBe('7,6%');
  });

  it('should render no decimals when digits is zero', () => {
    expect(formatPercent(15, 0)).toBe('15%');
  });

  it('should render zero percent when given null', () => {
    expect(formatPercent(null)).toBe('0,0%');
  });
});

describe('formatCount', () => {
  it('should group thousands with a dot when given a large number', () => {
    expect(formatCount(4120)).toBe('4.120');
  });

  it('should render zero when given null', () => {
    expect(formatCount(null)).toBe('0');
  });
});
