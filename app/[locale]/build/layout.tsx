// app/[locale]/build/layout.tsx — minimal chrome for the visual page builder.
// Deliberately excludes the storefront navbar/footer/providers; the builder is a
// full-screen admin surface. Always dynamic — it reads the live admin session.
import type { ReactElement, ReactNode } from 'react';
import '../../globals.css';

export const dynamic = 'force-dynamic';

export default function BuilderLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <div className="min-h-screen bg-warm-100 text-warm-900">{children}</div>;
}