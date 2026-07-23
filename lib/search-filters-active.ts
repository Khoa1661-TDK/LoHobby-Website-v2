/** True when the search request carries any facet filter (finding 4.4). */
export function hasActiveSearchFilters(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const has = (key: string): boolean => {
    const v = params[key];
    return typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) && v.length > 0;
  };
  return has('price_min') || has('price_max') || has('in_stock');
}
