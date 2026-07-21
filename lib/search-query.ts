// lib/search-query.ts — query parsing for storefront product search.
//
// Product slugs are stored unaccented and hyphenated (`mo-hinh-cheems-bonk`)
// while titles keep full diacritics (`mô hình cheems bonk`). Matching the raw
// query string against both means an unaccented multi-word query ("mo hinh")
// matches neither: the space cannot span the slug's hyphen, and "mo" is not
// "mô". Tokenising the query and requiring each token independently removes
// both the contiguity and the diacritic requirement.
import type { Where } from 'payload';

// U+0300–U+036F is the Combining Diacritical Marks block that NFD splits tone
// and vowel marks into. Written as escapes deliberately: the literal characters
// are invisible in source and do not survive copy-paste intact.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Separators that may appear between words in a query or a slug. */
const SEPARATORS = /[\s\-_/]+/;

/**
 * Strip Vietnamese diacritics so an unaccented query can reach accented data.
 *
 * NFD decomposition separates tone and vowel marks into combining characters
 * that are then dropped. `đ`/`Đ` (U+0111/U+0110) are distinct letters rather
 * than decomposable forms, so they are folded explicitly — without that,
 * "do choi" can never match "đồ chơi".
 */
export function deaccentText(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Lowercase and split a query on whitespace, hyphens, underscores and slashes. */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(SEPARATORS)
    .filter((token) => token.length > 0);
}

/**
 * Build the Payload filter for a product search.
 *
 * Every token must match somewhere (AND), and each token may match the title,
 * the description or the slug (OR). Tokens carrying diacritics additionally try
 * their stripped form against the slug, which is already stored unaccented.
 *
 * An empty or separator-only query yields `{}` — match everything — preserving
 * the previous behaviour for an absent query.
 */
export function buildProductSearchWhere(query: string | undefined): Where {
  const tokens = tokenizeSearchQuery(query ?? '');
  if (tokens.length === 0) return {};

  return {
    and: tokens.map((token) => {
      const alternatives: Where[] = [
        { title: { contains: token } },
        { description: { contains: token } },
        { slug: { contains: token } },
      ];

      const plain = deaccentText(token);
      if (plain !== token) {
        alternatives.push({ slug: { contains: plain } });
      }

      return { or: alternatives };
    }),
  };
}
