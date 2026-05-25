// app/product/[handle]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { getProduct } from '@/lib/shopify';

export const runtime = 'nodejs';
export const alt = 'Product image';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = { handle: string };

export default async function OG({ params }: { params: Params }): Promise<ImageResponse> {
  const product = await getProduct(params.handle);
  const title = product?.title ?? 'Toy';
  const price = product
    ? `${Number(product.priceRange.minVariantPrice.amount).toLocaleString('vi-VN')} ${product.priceRange.minVariantPrice.currencyCode}`
    : '';
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(160deg, #1a1410 0%, #2b1e15 50%, #5c2100 100%)',
          color: '#fff8f0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 28,
            opacity: 0.85,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#ff6b1a',
              color: '#fff8f0',
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: -1,
            }}
          >
            PT
          </div>
          {siteName}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            {title}
          </div>
          {price ? (
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                fontWeight: 700,
                background: '#ff6b1a',
                color: 'white',
                padding: '12px 28px',
                borderRadius: 999,
                alignSelf: 'flex-start',
              }}
            >
              {price}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.7 }}>
          Pay with VietQR · Printed to order
        </div>
      </div>
    ),
    size,
  );
}
