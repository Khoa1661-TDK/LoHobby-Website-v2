'use client';
// components/animations/CartFlyIn.tsx — portal-rendered ghost clone for the
// add-to-cart fly-in arc (spec §4).
//
// Mounted once near the app root (see components/providers.tsx). Listens for
// fly-in requests via the useCartFlyIn event bus. On each request it:
//   1. reads the source rect (product image) and cart icon rect at that moment,
//   2. clones the source into a fixed-position ghost in a portal,
//   3. arcs it product → cart via a 3-keyframe transform (x linear, y elevated
//      at the midpoint), shrinking + fading as it lands,
//   4. pulses the cart icon (scale 1→1.15→1) on arrival,
//   5. removes the clone.
//
// Reduced motion: skipped entirely — the item just appears in the cart.

import { useEffect, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';
import {
  CART_ICON_SELECTOR,
  subscribeCartFlyIn,
} from '@/lib/animations/hooks/useCartFlyIn';

const ARC_LIFT = 120; // px the midpoint rises above the straight line (spec §4)
const ARC_DURATION = 0.7; // seconds
const PULSE_DURATION = 0.3; // seconds

/** Run a single fly-in from `source` to the cart icon. Resolves when removed. */
function runFlight(source: HTMLElement): void {
  const cartIcon = document.querySelector<HTMLElement>(CART_ICON_SELECTOR);
  if (!cartIcon) return;

  const from = source.getBoundingClientRect();
  const to = cartIcon.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return;

  // Clone the source so the ghost visually matches the product image.
  const clone = source.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'fixed';
  clone.style.left = `${from.left}px`;
  clone.style.top = `${from.top}px`;
  clone.style.width = `${from.width}px`;
  clone.style.height = `${from.height}px`;
  clone.style.margin = '0';
  clone.style.zIndex = '60';
  clone.style.pointerEvents = 'none';
  clone.style.borderRadius = '12px';
  clone.style.overflow = 'hidden';
  clone.style.willChange = 'transform, opacity';
  document.body.appendChild(clone);

  // Translate from the source's top-left to the cart icon's centre.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  const controls = animate(
    clone,
    {
      // x interpolates linearly (start, halfway, end); y follows an arc by
      // lifting the midpoint above the straight interpolation.
      transform: [
        'translate(0px, 0px) scale(1)',
        `translate(${dx / 2}px, ${dy / 2 - ARC_LIFT}px) scale(0.6)`,
        `translate(${dx}px, ${dy}px) scale(0.15)`,
      ],
      opacity: [1, 1, 0.2],
    },
    { duration: ARC_DURATION, ease: 'easeInOut' } as never,
  );

  controls.finished
    .then(() => {
      clone.remove();
      // Cart icon pulse on arrival.
      animate(
        cartIcon,
        { transform: ['scale(1)', 'scale(1.15)', 'scale(1)'] },
        { duration: PULSE_DURATION, ease: 'easeOut' } as never,
      );
    })
    .catch(() => {
      clone.remove();
    });
}

export default function CartFlyIn(): ReactElement | null {
  useEffect(() => {
    const unsubscribe = subscribeCartFlyIn((source) => {
      if (prefersReducedMotion()) return; // skip entirely
      runFlight(source);
    });
    return unsubscribe;
  }, []);

  // No persistent DOM — clones are appended to <body> imperatively. The portal
  // exists only to keep this a valid mounted component in the React tree.
  if (typeof document === 'undefined') return null;
  return createPortal(<></>, document.body);
}
