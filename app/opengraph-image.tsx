// app/opengraph-image.tsx — default OG image for the site
import { ImageResponse } from 'next/og';
import { BRAND_ORIGIN, BRAND_TAGLINE, getSiteName } from '@/lib/brand';

export const runtime = 'edge';
export const alt = getSiteName();
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG(): ImageResponse {
  const title = getSiteName();
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ffffff',
          color: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'serif',
          border: '12px solid #000000',
        }}
      >
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>
          Lô
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            fontStyle: 'italic',
            marginTop: -8,
            letterSpacing: 2,
          }}
        >
          Mô Hình
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: -2,
            marginTop: -4,
          }}
        >
          Hobby
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            marginTop: 32,
            fontFamily: 'sans-serif',
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            marginTop: 16,
            fontFamily: 'sans-serif',
            opacity: 0.7,
          }}
        >
          {BRAND_TAGLINE}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            marginTop: 12,
            fontFamily: 'sans-serif',
            letterSpacing: 6,
            textTransform: 'uppercase',
            opacity: 0.5,
          }}
        >
          {BRAND_ORIGIN}
        </div>
      </div>
    ),
    size,
  );
}
