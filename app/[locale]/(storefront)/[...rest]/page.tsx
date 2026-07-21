// app/[locale]/(storefront)/[...rest]/page.tsx
// Unmatched paths under a locale prefix do not otherwise resolve into the
// storefront route group, so they fall through to Next's built-in bare 404.
// This lowest-priority catch-all pulls them into the group and triggers the
// branded not-found.tsx above, inside the storefront layout.
import { notFound } from 'next/navigation';

export default function StorefrontCatchAll(): never {
  notFound();
}
