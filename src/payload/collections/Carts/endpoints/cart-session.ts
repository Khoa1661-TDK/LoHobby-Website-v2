// src/payload/collections/Carts/endpoints/cart-session.ts — ShopNex-style cart session API
import type { Endpoint } from 'payload';
import { generateCookie, getCookieExpiration, mergeHeaders } from 'payload';

const CART_COOKIE = 'cart-session';
const CART_MAX_AGE_SEC = 60 * 60 * 24 * 30;

type CartItemInput = {
  product: number;
  variantId: string;
  quantity: number;
};

function parseProductId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function parseItem(value: unknown): CartItemInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const product = parseProductId(raw.product);
  const variantId =
    typeof raw.variantId === 'string'
      ? raw.variantId
      : typeof raw.id === 'string'
        ? raw.id
        : null;
  const quantity = typeof raw.quantity === 'number' ? Math.floor(raw.quantity) : 0;
  if (product === null || !variantId || quantity <= 0) return null;
  return { product, variantId, quantity };
}

function setCartCookie(headers: Headers, sessionId: string): void {
  const cartCookie = generateCookie({
    name: CART_COOKIE,
    expires: getCookieExpiration({ seconds: CART_MAX_AGE_SEC }),
    path: '/',
    returnCookieAsObject: false,
    value: sessionId,
  });
  headers.set('Set-Cookie', cartCookie as string);
}

export const createCartSession: Endpoint = {
  method: 'post',
  path: '/session',
  handler: async (req) => {
    const body = (await req.json?.().catch(() => null)) as { item?: unknown } | null;
    const item = parseItem(body?.item);
    if (!item) {
      return Response.json({ success: false, error: 'Invalid item' }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    const cart = await req.payload.create({
      collection: 'carts',
      data: {
        sessionId,
        cartItems: [
          {
            product: item.product,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        ],
      },
      req,
    });

    const headers = new Headers();
    setCartCookie(headers, sessionId);
    req.responseHeaders = req.responseHeaders
      ? mergeHeaders(req.responseHeaders, headers)
      : headers;

    return Response.json(
      { success: true, cartItems: cart.cartItems },
      { headers: { 'Set-Cookie': headers.get('Set-Cookie') ?? '' } },
    );
  },
};

export const updateCartSession: Endpoint = {
  method: 'patch',
  path: '/session/:sessionId',
  handler: async (req) => {
    const sessionId =
      typeof req.routeParams?.sessionId === 'string' ? req.routeParams.sessionId : '';
    if (!sessionId) {
      return Response.json({ success: false, error: 'Missing session' }, { status: 400 });
    }

    const body = (await req.json?.().catch(() => null)) as {
      item?: unknown;
      action?: string;
    } | null;
    const item = parseItem(body?.item);
    if (!item) {
      return Response.json({ success: false, error: 'Invalid item' }, { status: 400 });
    }

    const existing = await req.payload.find({
      collection: 'carts',
      where: { sessionId: { equals: sessionId } },
      limit: 1,
      pagination: false,
      depth: 0,
      req,
    });

    const cart = existing.docs[0];
    if (!cart?.id) {
      return Response.json({ success: false, error: 'Cart not found' }, { status: 404 });
    }

    const items = Array.isArray(cart.cartItems) ? [...cart.cartItems] : [];
    const idx = items.findIndex(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        (row as { variantId?: string }).variantId === item.variantId,
    );

    if (idx >= 0) {
      const row = items[idx] as { quantity?: number };
      const current = typeof row.quantity === 'number' ? row.quantity : 0;
      row.quantity = body?.action === 'update' ? item.quantity : current + item.quantity;
      if (row.quantity <= 0) items.splice(idx, 1);
    } else {
      items.push({
        product: item.product,
        variantId: item.variantId,
        quantity: item.quantity,
      });
    }

    const updated = await req.payload.update({
      collection: 'carts',
      id: cart.id,
      data: { cartItems: items },
      req,
    });

    return Response.json({ success: true, cartItems: updated.cartItems ?? [] });
  },
};
