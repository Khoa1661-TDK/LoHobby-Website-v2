/** Formats a review timestamp using the active storefront locale (finding 3.5). */
export function formatReviewDate(value: string, locale: string): string {
  const intlLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  return new Date(value).toLocaleDateString(intlLocale, { dateStyle: 'medium' });
}
