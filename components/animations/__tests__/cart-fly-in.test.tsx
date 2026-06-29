import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveFlySource,
  subscribeCartFlyIn,
  useCartFlyIn,
} from '@/lib/animations/hooks/useCartFlyIn';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('resolveFlySource', () => {
  it('should prefer a marked source inside the nearest product container', () => {
    document.body.innerHTML = `
      <article>
        <div data-cart-fly-source id="scoped"></div>
        <button id="trigger"></button>
      </article>
      <div data-cart-fly-source id="global"></div>
    `;
    const trigger = document.getElementById('trigger') as HTMLElement;
    expect(resolveFlySource(trigger)?.id).toBe('scoped');
  });

  it('should fall back to a document-wide marker when none is in scope', () => {
    document.body.innerHTML = `
      <div><button id="trigger"></button></div>
      <div data-cart-fly-source id="global"></div>
    `;
    const trigger = document.getElementById('trigger') as HTMLElement;
    expect(resolveFlySource(trigger)?.id).toBe('global');
  });

  it('should fall back to the trigger element when no marker exists', () => {
    document.body.innerHTML = `<button id="trigger"></button>`;
    const trigger = document.getElementById('trigger') as HTMLElement;
    expect(resolveFlySource(trigger)?.id).toBe('trigger');
  });
});

describe('cart fly-in event bus', () => {
  it('should notify subscribers with the resolved source on flyToCart', () => {
    document.body.innerHTML = `<div data-cart-fly-source id="src"></div>`;
    const listener = vi.fn();
    const unsubscribe = subscribeCartFlyIn(listener);

    // useCartFlyIn is a thin hook; call its returned fn directly (no React state).
    const { flyToCart } = useCartFlyIn();
    flyToCart(null);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as HTMLElement).id).toBe('src');
    unsubscribe();
  });

  it('should not notify after unsubscribe', () => {
    document.body.innerHTML = `<div data-cart-fly-source id="src"></div>`;
    const listener = vi.fn();
    const unsubscribe = subscribeCartFlyIn(listener);
    unsubscribe();

    const { flyToCart } = useCartFlyIn();
    flyToCart(null);

    expect(listener).not.toHaveBeenCalled();
  });
});
