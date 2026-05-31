// lib/payload-variant-context.ts — resolve parent product when creating a variant

type RequestLike = {
  url?: string | null;
  headers?: { get?: (name: string) => string | null };
};

/** Extract parent product id from admin create URLs / referer (product edit → create variant). */
export function resolveParentProductIdFromRequest(req: RequestLike): number | null {
  const url = typeof req.url === 'string' ? req.url : '';

  const queryPatterns = [
    /[?&]product(?:Id)?=(\d+)/i,
    /[?&]value=(\d+)/i,
    /[?&]doc(?:Id)?=(\d+)/i,
    /[?&]id=(\d+)/i,
    /\/collections\/products\/(\d+)/i,
  ];

  for (const pattern of queryPatterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      const id = Number.parseInt(match[1], 10);
      if (Number.isFinite(id)) return id;
    }
  }

  const referer = req.headers?.get?.('referer') ?? '';
  const refererMatch = referer.match(/\/collections\/products\/(\d+)/);
  if (refererMatch?.[1]) {
    const id = Number.parseInt(refererMatch[1], 10);
    if (Number.isFinite(id)) return id;
  }

  return null;
}
