// app/opengraph-image.tsx — default OG image for the site
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG(): ImageResponse {
  const title = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #ff6b1a 0%, #e35400 45%, #0aa89a 100%)',
          color: '#fff8f0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            opacity: 0.85,
            marginBottom: 16,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          3D-printed toys
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            marginTop: 28,
            opacity: 0.9,
          }}
        >
          Articulated figures · Fidget toys · Tabletop bits
        </div>
      </div>
    ),
    size,
  );
}
