import type { MetadataRoute } from 'next';
import { getStoreBranding } from '@/lib/store-branding';

// Reads store branding from Payload (Postgres); render on demand so the build
// requires no database connection.
export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getStoreBranding();

  return {
    name: branding.storeName,
    short_name: branding.storeName,
    description: branding.descriptionShort,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: branding.primaryColor,
    icons: [
      {
        src: branding.faviconUrl ?? '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: branding.logoUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
