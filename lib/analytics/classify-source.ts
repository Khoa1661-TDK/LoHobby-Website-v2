// lib/analytics/classify-source.ts — pure first-touch attribution classifier
//
// No DOM, no 'use client' imports, no side-effects — safe in any runtime.
// Extracted from track-client.ts so it can be unit-tested in Node Vitest.

export type Attribution = {
  source: string;
  medium: string;
  campaign: string | null;
};

export type ClassifyInput = {
  /** Raw query string or URLSearchParams from the landing URL. */
  search: string | URLSearchParams;
  /** document.referrer (may be ''). */
  referrer: string;
  /** Current site host, used to treat internal referrers as direct. */
  currentHost?: string;
};

// Known referrer hosts → channel. Substring match against the referrer hostname.
const ORGANIC_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'cốc cốc', 'coccoc.'];
const SOCIAL_HOSTS = [
  'facebook.',
  'instagram.',
  'zalo.',
  'tiktok.',
  'youtube.',
  'twitter.',
  't.co',
  'x.com',
  'pinterest.',
  'threads.',
];

function hostnameOf(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchHost(host: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (host.includes(needle)) {
      // Use the registrable-ish label before the first dot as the source name.
      return needle.replace(/\.$/, '').split('.')[0] ?? host;
    }
  }
  return null;
}

/**
 * Classify first-touch attribution. Priority: explicit utm_* → known referrer
 * host → bare referrer (referral) → direct. Pure: no window access.
 */
export function classifySource(input: ClassifyInput): Attribution {
  const params =
    typeof input.search === 'string' ? new URLSearchParams(input.search) : input.search;

  const utmSource = params.get('utm_source')?.trim();
  const utmMedium = params.get('utm_medium')?.trim();
  const utmCampaign = params.get('utm_campaign')?.trim();

  if (utmSource) {
    return {
      source: utmSource.toLowerCase(),
      medium: (utmMedium || 'referral').toLowerCase(),
      campaign: utmCampaign || null,
    };
  }

  const host = hostnameOf(input.referrer);
  if (!host) {
    return { source: 'direct', medium: 'direct', campaign: null };
  }

  // Internal navigation — not a new acquisition source.
  if (input.currentHost && host === input.currentHost.toLowerCase()) {
    return { source: 'direct', medium: 'direct', campaign: null };
  }

  const organic = matchHost(host, ORGANIC_HOSTS);
  if (organic) return { source: organic, medium: 'organic', campaign: null };

  const social = matchHost(host, SOCIAL_HOSTS);
  if (social) return { source: social, medium: 'social', campaign: null };

  return { source: host, medium: 'referral', campaign: null };
}