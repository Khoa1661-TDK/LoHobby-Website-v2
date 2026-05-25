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
          background: '#ff6b1a',
          color: '#fff8f0',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        PT
      </div>
    ),
    size,
  );
}
