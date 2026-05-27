// prisma/products-catalog.ts — Lô Hobby product catalog for Payload seeding
export type CatalogProduct = {
  handle: string;
  title: string;
  description: string;
  priceVnd: number;
  currency: string;
  images: string[];
  available: boolean;
  tags: string[];
};

const img = (slug: string): string[] => [
  `https://picsum.photos/seed/lohobby-${slug}/1200/1200`,
];

/** Real reference images for hero/carousel demos (Wikimedia Commons). */
const F22_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Lockheed_Martin_F-22_Raptor_%2709-191_-_FF%27_%2827585261174%29.jpg/1280px-Lockheed_Martin_F-22_Raptor_%2709-191_-_FF%27_%2827585261174%29.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/A_F-22_Raptor_performs_a_vertical_take_off_%2833048702564%29.jpg/1280px-A_F-22_Raptor_performs_a_vertical_take_off_%2833048702564%29.jpg',
];

function p(
  handle: string,
  title: string,
  description: string,
  priceVnd: number,
  category: string,
  opts?: { available?: boolean; extraTags?: string[]; images?: string[] },
): CatalogProduct {
  const tags = [category, 'all', ...(opts?.extraTags ?? [])];
  return {
    handle,
    title,
    description,
    priceVnd,
    currency: 'VND',
    images: opts?.images ?? img(handle),
    available: opts?.available ?? true,
    tags,
  };
}

export const CATALOG: CatalogProduct[] = [
  // ── Móc khóa ──
  p('moc-khoa-co-viet-nam', 'Móc khóa Cờ Việt Nam', 'Móc khóa mini cờ đỏ sao vàng in 3D, màu sắc bền.', 35_000, 'moc-khoa', { extraTags: ['new'] }),
  p('moc-khoa-logo-blg', 'Móc khóa Logo BLG Esports', 'Móc khóa logo team BLG — fan Liên Minh Huyền Thoại.', 45_000, 'moc-khoa'),
  p('moc-khoa-logo-geng', 'Móc khóa Logo Gen.G', 'Móc khóa logo Gen.G Esports, in 3D chi tiết.', 45_000, 'moc-khoa'),
  p('moc-khoa-logo-valorant', 'Móc khóa Logo Valorant', 'Móc khóa logo Valorant cho fan FPS.', 42_000, 'moc-khoa'),
  p('moc-khoa-minecraft-steve', 'Móc khóa Minecraft Steve', 'Móc khóa nhân vật Steve pixel style.', 38_000, 'moc-khoa'),
  p('moc-khoa-minecraft-creeper', 'Móc khóa Minecraft Creeper', 'Móc khóa Creeper xanh lá đặc trưng.', 38_000, 'moc-khoa'),
  p('moc-khoa-cu-cam-handmade', 'Móc khóa Cú Cam Handmade', 'Móc khóa cú fox cam màu cam handmade, đáng yêu.', 28_000, 'moc-khoa', { extraTags: ['new'] }),

  // ── Mô hình 3D ──
  p('mo-hinh-f16-falcon', 'Mô hình F-16 Fighting Falcon', 'Mô hình máy bay F-16 trên giá đỡ, chi tiết cánh và cánh đuôi.', 189_000, 'mo-hinh', { extraTags: ['new'] }),
  p('mo-hinh-f22-raptor', 'Mô hình F-22 Raptor', 'Mô hình stealth fighter F-22, hoàn thiện xám matte.', 219_000, 'mo-hinh', {
    images: F22_IMAGES,
    extraTags: ['new'],
  }),
  p('mo-hinh-f35-lightning', 'Mô hình F-35 Lightning II', 'Mô hình F-35 JSF trên đế trưng bày.', 229_000, 'mo-hinh'),
  p('mo-hinh-glock-17', 'Mô hình Glock 17 Mini', 'Súng lục mini tỉ lệ 1:3 in 3D, hoàn thiện đen matte.', 189_000, 'mo-hinh', { extraTags: ['new'] }),
  p('mo-hinh-ak47-s', 'Mô hình AK-47 S', 'Khẩu AK thu nhỏ báng gỗ texture, lắp ráp snap-fit.', 249_000, 'mo-hinh'),
  p('tank-m1-abrams', 'Mô hình Tank M1 Abrams', 'Xe tăng M1 Abrams tháp pháo xoay 360°.', 890_000, 'mo-hinh'),
  p('tank-t72-b3', 'Mô hình Tank T-72 B3', 'T-72 B3 giáp phản ứng 125mm.', 790_000, 'mo-hinh', { extraTags: ['new'] }),

  // ── Figure & Blind box ──
  p('figure-toothless-mini', 'Figure Toothless Mini', 'Figure rồng Toothless mini trưng bày.', 85_000, 'figure', { extraTags: ['new'] }),
  p('figure-danbo', 'Figure Danbo Robot', 'Figure hộp giấy Danbo cardboard robot.', 78_000, 'figure'),
  p('figure-capybara', 'Figure Capybara Mini', 'Figure capybara đáng yêu in 3D.', 72_000, 'figure'),
  p('figure-minecraft-set', 'Figure Minecraft Set 3', 'Bộ 3 figure Minecraft pixel style.', 95_000, 'figure'),

  // ── Đồ chơi & Mini ──
  p('do-choi-roblox-keyrambit', 'Đồ Chơi Roblox Keyrambit', 'Keyrambit phong cách Roblox, prop cosplay mini.', 55_000, 'do-choi', { extraTags: ['new'] }),
  p('do-choi-squid-game-kiem', 'Kiếm Squid Game Mini', 'Kiếm Squid Game mini trưng bày/cosplay.', 65_000, 'do-choi'),
  p('do-choi-kiem-phat-sang', 'Kiếm Phát Sáng Mini', 'Kiếm mini có LED, pin cúc áo.', 89_000, 'do-choi'),
  p('do-choi-minecraft-block-set', 'Bộ Block Minecraft Trang Trí', 'Bộ block Minecraft trang trí desk.', 68_000, 'do-choi'),

  // ── Phụ kiện ──
  p('phu-kien-op-moondrop-space', 'Ốp Moondrop Space Travel', 'Vỏ bảo vệ hộp sạc tai nghe Moondrop Space Travel.', 55_000, 'phu-kien', { extraTags: ['new'] }),
  p('phu-kien-skin-mx-master-3s', 'Skin Chuột Logitech MX Master 3/3S', 'Skin/grip side cho MX Master 3 và 3S.', 75_000, 'phu-kien'),
  p('phu-kien-ke-trung-bay', 'Kệ Trưng Bày Mini', 'Kệ trưng bày mô hình mini 20×20 cm.', 150_000, 'phu-kien'),
  p('phu-kien-hop-airpods-block', 'Hộp AirPods Hình Gạch', 'Case AirPods hình building block sáng tạo.', 85_000, 'phu-kien'),

  // ── Quà tặng ──
  p('qua-tang-set-moc-khoa-5', 'Set Quà 5 Móc Khóa Mix', 'Combo 5 móc khóa mix ngẫu nhiên — quà tặng.', 129_000, 'qua-tang', { extraTags: ['new'] }),
  p('qua-tang-set-mo-hinh-nho', 'Set Quà Mô Hình Nhỏ 3 Món', 'Combo 3 mô hình nhỏ tặng bạn bè.', 199_000, 'qua-tang'),
  p('qua-tang-hop-qua-hobby', 'Hộp Quà Hobby Lô', 'Hộp quà gồm móc khóa + charm + sticker Lô Hobby.', 159_000, 'qua-tang'),
];
