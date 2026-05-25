// app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';
  return {
    name,
    short_name: name,
    description: '3D-printed toys, figures, and tabletop bits — paid via VietQR.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8f0',
    theme_color: '#ff6b1a',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/icon', sizes: '192x192', type: 'image/png' },
    ],
  };
}
