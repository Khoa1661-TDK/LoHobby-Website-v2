// lib/brand.ts — Lô Hobby brand constants
export const BRAND_NAME = 'Lô Hobby';
export const BRAND_NAME_FULL = 'Lô Mô Hình Hobby';
export const BRAND_TAGLINE = 'Bảo hành kể cả lỗi người dùng';
export const BRAND_ORIGIN = 'Sản xuất tại Việt Nam';

export const BRAND_DESCRIPTION =
  'Cửa hàng mô hình in 3D, móc khóa, figure, đồ chơi mini & phụ kiện hobby. Nhiều dòng sản phẩm — in theo đơn tại Việt Nam, thanh toán VietQR.';

export const BRAND_DESCRIPTION_SHORT =
  'Mô hình 3D, móc khóa, figure & đồ hobby — sản xuất tại Việt Nam, thanh toán VietQR.';

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME ?? BRAND_NAME;
}
