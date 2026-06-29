'use client';
// lib/animations/hooks/useCartFlyIn.ts — "add to cart" fly-in trigger.
//
// The button that adds an item and the navbar cart icon live in different parts
// of the React tree, so we decouple them with a tiny module-level event bus.
// `useCartFlyIn()` returns `flyToCart(sourceEl)`; the single <CartFlyIn/> mounted
// near the app root subscribes and renders the portal ghost clone (spec §4).
//
// Reduced motion: the caller is responsible for skipping the fly-in entirely
// (item appears in cart instantly). The hook still works, but CartFlyIn checks
// prefersReducedMotion() and no-ops, so a stray call is harmless.

/** Selector for the navbar cart icon target (set in components/cart/modal.tsx). */
export const CART_ICON_SELECTOR = '[data-cart-icon]';
/** Selector for the element to clone as the flying ghost (the product image). */
export const CART_FLY_SOURCE_SELECTOR = '[data-cart-fly-source]';

type FlyListener = (sourceEl: HTMLElement) => void;

const listeners = new Set<FlyListener>();

/** Subscribe to fly-in requests. Returns an unsubscribe fn. Used by CartFlyIn. */
export function subscribeCartFlyIn(listener: FlyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Emit a fly-in request for the given source element. */
function emitCartFlyIn(sourceEl: HTMLElement): void {
  for (const listener of listeners) listener(sourceEl);
}

/**
 * Resolve the best "source" element to clone for the fly-in, given the element
 * that triggered it (typically the Add-to-Cart button). Prefers a marked
 * product image inside the nearest product container, falling back to a
 * document-wide marker, then the trigger element itself.
 */
export function resolveFlySource(trigger: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (trigger) {
    const scope = trigger.closest('article, [data-product]') ?? document;
    const scoped = scope.querySelector<HTMLElement>(CART_FLY_SOURCE_SELECTOR);
    if (scoped) return scoped;
  }
  const global = document.querySelector<HTMLElement>(CART_FLY_SOURCE_SELECTOR);
  return global ?? trigger;
}

/** Resolve the source from a trigger element and emit a fly-in for it. Plain
 *  function (no React) so it's callable from anywhere and unit-testable. */
export function flyToCart(sourceEl: HTMLElement | null): void {
  const source = resolveFlySource(sourceEl);
  if (source) emitCartFlyIn(source);
}

/** Returns `flyToCart(sourceEl)` — emits a fly-in from the given element. */
export function useCartFlyIn(): { flyToCart: (sourceEl: HTMLElement | null) => void } {
  return { flyToCart };
}
