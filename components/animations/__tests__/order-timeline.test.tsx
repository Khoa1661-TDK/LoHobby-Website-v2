import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OrderTimeline, {
  type TimelineStep,
} from '@/components/animations/OrderTimeline';

const STEPS: TimelineStep[] = [
  { key: 'pending', label: 'Đặt hàng' },
  { key: 'paid', label: 'Thanh toán' },
  { key: 'shipped', label: 'Giao hàng' },
  { key: 'delivered', label: 'Hoàn tất' },
];

describe('OrderTimeline', () => {
  it('should render every step label on the server (no-JS readable)', () => {
    const html = renderToStaticMarkup(
      <OrderTimeline steps={STEPS} currentStep={1} />,
    );
    for (const step of STEPS) {
      expect(html).toContain(step.label);
    }
  });

  it('should mark steps up to and including current as done (filled)', () => {
    // currentStep = 2 → pending, paid, shipped are done; delivered is not.
    const html = renderToStaticMarkup(
      <OrderTimeline steps={STEPS} currentStep={2} />,
    );
    const filled = html.match(/bg-emerald-500/g) ?? [];
    // 3 done dots (indices 0,1,2).
    expect(filled.length).toBe(3);
  });

  it('should draw a checkmark only for completed steps (before current)', () => {
    // currentStep = 2 → indices 0 and 1 are complete (checkmark), 2 is active (no check).
    const html = renderToStaticMarkup(
      <OrderTimeline steps={STEPS} currentStep={2} />,
    );
    const checks = html.match(/data-timeline-check/g) ?? [];
    expect(checks.length).toBe(2);
  });

  it('should render no checkmarks when current is the first step', () => {
    const html = renderToStaticMarkup(
      <OrderTimeline steps={STEPS} currentStep={0} />,
    );
    expect(html).not.toContain('data-timeline-check');
    // Only the active (first) dot is filled.
    expect((html.match(/bg-emerald-500/g) ?? []).length).toBe(1);
  });

  it('should expose a timeline dot per step for the animation to target', () => {
    const html = renderToStaticMarkup(
      <OrderTimeline steps={STEPS} currentStep={1} />,
    );
    expect((html.match(/data-timeline-dot/g) ?? []).length).toBe(STEPS.length);
  });
});
