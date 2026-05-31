import type { ReactElement } from 'react';
import { brandingCssVariables, type StoreBranding } from '@/lib/store-branding';

type Props = {
  branding: StoreBranding;
};

/** Injects per-store CSS variables so Tailwind brand tokens update without a rebuild. */
export default function BrandTheme({ branding }: Props): ReactElement {
  const vars = brandingCssVariables(branding);
  const css = `:root{${Object.entries(vars)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')}}`;

  return (
    <style
      id="store-brand-theme"
      // Brand colors are admin-controlled hex values validated in resolveStoreBranding.
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
