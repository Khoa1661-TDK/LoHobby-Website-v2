import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CountdownBlock, { computeRemaining } from '@/components/blocks/Countdown';

describe('computeRemaining', () => {
  it('should break a future diff into days/hours/minutes/seconds', () => {
    const target = (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000; // 1d 2h 3m 4s from 0
    expect(computeRemaining(target, 0)).toMatchObject({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      done: false,
    });
  });

  it('should mark done when the target has passed', () => {
    expect(computeRemaining(0, 1000).done).toBe(true);
  });
});

describe('CountdownBlock', () => {
  it('should render nothing without a valid targetDate', () => {
    expect(renderToStaticMarkup(<CountdownBlock targetDate={null} />)).toBe('');
  });
});
