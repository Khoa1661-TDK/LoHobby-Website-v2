// lib/default-categories.ts — canonical storefront categories (Payload seed + allowlist)
export type DefaultCategory = {
  slug: string;
  title: string;
  subtitle: string;
};

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    slug: 'moc-khoa',
    title: 'Móc khóa',
    subtitle: 'Móc khóa cờ, logo, game & figure mini',
  },
  {
    slug: 'mo-hinh',
    title: 'Mô hình 3D',
    subtitle: 'Máy bay, xe tăng, vũ khí & mô hình lắp ráp in 3D',
  },
  {
    slug: 'figure',
    title: 'Figure & Blind box',
    subtitle: 'Figure anime, meme, rồng & nhân vật sưu tầm',
  },
  {
    slug: 'do-choi',
    title: 'Đồ chơi & Mini',
    subtitle: 'Đồ chơi lắp ráp, prop mini, Roblox, Minecraft & merch game',
  },
  {
    slug: 'phu-kien',
    title: 'Phụ kiện',
    subtitle: 'Ốp tai nghe, linh kiện & phụ kiện hobby',
  },
  {
    slug: 'qua-tang',
    title: 'Quà tặng',
    subtitle: 'Set quà, combo & sản phẩm tặng kèm',
  },
] as const;

export const DEFAULT_CATEGORY_SLUGS = new Set(DEFAULT_CATEGORIES.map((c) => c.slug));

/** Map duplicate/legacy slugs to their canonical replacement. */
export const CATEGORY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'do-choi-mini': 'do-choi',
  infantry: 'mo-hinh',
  vehicles: 'mo-hinh',
  crossbow: 'mo-hinh',
  accessories: 'phu-kien',
};

export function getDefaultCategoryOrder(slug: string): number {
  const index = DEFAULT_CATEGORIES.findIndex((c) => c.slug === slug);
  return index === -1 ? DEFAULT_CATEGORIES.length + 1 : index;
}
