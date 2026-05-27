// app/icon.tsx — favicon generated at build time
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
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
          border: '2px solid #000000',
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>
          Lô
        </div>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, marginTop: 1 }}>
          HOBBY
        </div>
      </div>
    ),
    size,
  );
}
