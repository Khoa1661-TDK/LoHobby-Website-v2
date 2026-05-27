// app/(storefront)/product/[handle]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { getSiteName } from '@/lib/brand';
import { getPayloadProductBySlug } from '@/lib/payload-products';

export const runtime = 'nodejs';
export const alt = 'Hình ảnh sản phẩm';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = Promise<{ handle: string }>;

export default async function OG({ params }: { params: Params }): Promise<ImageResponse> {
  const { handle } = await params;
  const product = await getPayloadProductBySlug(handle);
  const title = product?.title ?? 'Mô hình';
  const price = product
    ? `${Number(product.priceRange.minVariantPrice.amount).toLocaleString('vi-VN')} ${product.priceRange.minVariantPrice.currencyCode}`
    : '';
  const siteName = getSiteName();

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
          justifyContent: 'space-between',
          padding: '64px',
          fontFamily: 'serif',
          border: '8px solid #000000',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 8,
              border: '2px solid #000000',
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            Lô
          </div>
          {siteName}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          {price ? (
            <div
              style={{
                display: 'flex',
                fontSize: 36,
                fontWeight: 700,
                background: '#000000',
                color: 'white',
                padding: '12px 28px',
                borderRadius: 999,
                alignSelf: 'flex-start',
                fontFamily: 'sans-serif',
              }}
            >
              {price}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            opacity: 0.6,
            fontFamily: 'sans-serif',
          }}
        >
          Thanh toán VietQR · Sản xuất tại Việt Nam
        </div>
      </div>
    ),
    size,
  );
}
