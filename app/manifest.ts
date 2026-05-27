// app/manifest.ts
import type { MetadataRoute } from 'next';
import { BRAND_DESCRIPTION_SHORT, getSiteName } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  const name = getSiteName();
  return {
    name,
    short_name: name,
    description: BRAND_DESCRIPTION_SHORT,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f5',
    theme_color: '#000000',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/brand/lo-hobby-logo.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
