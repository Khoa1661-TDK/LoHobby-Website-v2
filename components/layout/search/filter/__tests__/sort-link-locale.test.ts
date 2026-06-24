// Regression guard for the doubled-locale bug: sort/pagination links rendered as
// /vi/vi/search?sort=... and broke every sort & page click. Root cause was importing
// usePathname from 'next/navigation' (locale-prefixed) while rendering through the
// i18n `Link` (which re-adds the locale). Any client component that both renders the
// i18n Link AND calls usePathname to build that link's href MUST take usePathname from
// '@/i18n/navigation' so the prefix is applied exactly once.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../../../..');

// Files that build a Link href from usePathname() and so must use the i18n pathname.
const LINK_HREF_FROM_PATHNAME = [
  'components/layout/search/filter/item.tsx',
  'components/pagination.tsx',
];

describe('locale-aware navigation in link-building components', () => {
  it.each(LINK_HREF_FROM_PATHNAME)(
    'should import usePathname from @/i18n/navigation in %s',
    (rel) => {
      const src = readFileSync(path.join(root, rel), 'utf8');
      // Uses the i18n Link (the source of the second locale prefix)...
      expect(src).toMatch(/from '@\/i18n\/navigation'/);
      // ...and must NOT pull usePathname from next/navigation.
      expect(src).not.toMatch(/import\s*\{[^}]*\busePathname\b[^}]*\}\s*from\s*'next\/navigation'/);
      // ...it must come from the i18n module instead.
      expect(src).toMatch(/import\s*\{[^}]*\busePathname\b[^}]*\}\s*from\s*'@\/i18n\/navigation'/);
    },
  );
});
