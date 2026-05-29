// scripts/seed-seo-landing.ts
// Provisions the "Đồ chơi in 3D" SEO landing category: SEO meta, long-form
// lexical content (H2/H3 + internal interlinks) and FAQ entries that power the
// on-page copy + FAQPage JSON-LD on /search/do-choi-in-3d.
import { config as loadEnv } from 'dotenv';

loadEnv();

const SLUG = 'do-choi-in-3d';
const TITLE = 'Đồ chơi in 3D';
const SUBTITLE = 'Đồ chơi, mô hình & móc khóa in 3D theo yêu cầu — sản xuất tại Việt Nam';

const META_TITLE = 'Đồ Chơi In 3D Theo Yêu Cầu | Lô Hobby';
const META_DESCRIPTION =
  'Xưởng in 3D đồ chơi, mô hình & móc khóa theo yêu cầu tại Việt Nam. Nhựa PLA/PETG an toàn cho bé, in theo mẫu riêng, giao toàn quốc, thanh toán VietQR.';

// ---- Minimal lexical (SerializedEditorState) builders -----------------------

type LexNode = Record<string, unknown>;

function text(value: string): LexNode {
  return { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: value, version: 1 };
}

function link(url: string, label: string): LexNode {
  return {
    type: 'link',
    version: 3,
    fields: { linkType: 'custom', url, newTab: false },
    format: '',
    indent: 0,
    direction: 'ltr',
    children: [text(label)],
  };
}

function paragraph(children: LexNode[]): LexNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
    children,
  };
}

function heading(tag: 'h2' | 'h3', value: string): LexNode {
  return {
    type: 'heading',
    tag,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [text(value)],
  };
}

function list(listType: 'bullet' | 'number', items: LexNode[][]): LexNode {
  return {
    type: 'list',
    listType,
    tag: listType === 'number' ? 'ol' : 'ul',
    start: 1,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: items.map((children, index) => ({
      type: 'listitem',
      value: index + 1,
      checked: undefined,
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children,
    })),
  };
}

function buildContent(): LexNode {
  const children: LexNode[] = [
    heading('h2', 'Vì sao chọn đồ chơi in 3D tại Lô Hobby'),
    paragraph([
      text(
        'Lô Hobby là xưởng in 3D đồ chơi, mô hình và móc khóa theo yêu cầu tại Việt Nam. Mỗi sản phẩm được in theo đơn, hoàn thiện thủ công và kiểm tra trước khi giao — bảo hành kể cả lỗi người dùng.',
      ),
    ]),
    list('bullet', [
      [text('In theo mẫu riêng: gửi ảnh hoặc file 3D, chúng tôi dựng và in đúng ý bạn.')],
      [text('Chất liệu an toàn: nhựa PLA gốc thực vật và PETG bền chắc.')],
      [text('Giao hàng toàn quốc, thanh toán nhanh bằng VietQR.')],
    ]),

    heading('h2', 'Các loại đồ chơi in 3D phổ biến'),
    heading('h3', 'Mô hình in 3D'),
    paragraph([
      text('Máy bay, xe tăng, vũ khí và mô hình lắp ráp chi tiết. Xem thêm tại '),
      link('/search/mo-hinh', 'danh mục Mô hình 3D'),
      text('.'),
    ]),
    heading('h3', 'Móc khóa in 3D'),
    paragraph([
      text('Móc khóa cờ, logo, game và figure mini — quà tặng giá rẻ, in nhanh. Xem '),
      link('/search/moc-khoa', 'danh mục Móc khóa'),
      text('.'),
    ]),
    heading('h3', 'Figure in 3D'),
    paragraph([
      text('Figure anime, meme và nhân vật sưu tầm. Khám phá '),
      link('/search/figure', 'danh mục Figure & Blind box'),
      text('.'),
    ]),
    heading('h3', 'Đồ chơi in 3D cho bé'),
    paragraph([
      text(
        'Đồ chơi lắp ráp và prop mini in từ nhựa PLA an toàn, bo tròn cạnh sắc, phù hợp cho bé trên 3 tuổi.',
      ),
    ]),

    heading('h2', 'Chất liệu in 3D an toàn: PLA & PETG'),
    heading('h3', 'Nhựa PLA – an toàn cho trẻ em'),
    paragraph([
      text(
        'PLA là nhựa sinh học từ tinh bột ngô, không chứa BPA, không mùi độc, là lựa chọn phổ biến cho đồ chơi tiếp xúc trẻ em.',
      ),
    ]),
    heading('h3', 'Nhựa PETG – độ bền cao'),
    paragraph([
      text('PETG chịu lực và chịu nhiệt tốt hơn, an toàn thực phẩm, dùng cho chi tiết cần độ bền. Tìm hiểu thêm: '),
      link('/info/in-3d-an-toan-cho-be', 'đồ chơi in 3D có an toàn cho bé không?'),
    ]),

    heading('h2', 'Quy trình in 3D đồ chơi theo yêu cầu'),
    list('number', [
      [text('Gửi mẫu / ý tưởng (ảnh, file STL/OBJ hoặc mô tả).')],
      [text('Dựng & duyệt mô hình 3D, báo giá, chốt màu sắc và chất liệu.')],
      [text('In & hoàn thiện bằng công nghệ FDM, xử lý bề mặt.')],
      [text('Giao hàng toàn quốc, thanh toán VietQR.')],
    ]),
    paragraph([
      text('Xem chi tiết '),
      link('/info/quy-trinh-in-3d-theo-yeu-cau', 'quy trình in 3D theo yêu cầu'),
      text('.'),
    ]),

    heading('h2', 'Bảng giá in 3D đồ chơi'),
    list('bullet', [
      [text('Móc khóa in 3D: từ 25.000₫.')],
      [text('Mô hình in 3D cỡ nhỏ: từ 90.000₫.')],
      [text('Figure & mô hình chi tiết: từ 150.000₫.')],
      [text('In theo mẫu riêng: báo giá theo kích thước và độ phức tạp.')],
    ]),
  ];

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children,
    },
  } as unknown as LexNode;
}

const FAQ = [
  {
    question: 'Đồ chơi in 3D có an toàn cho bé không?',
    answer:
      'Có. Chúng tôi dùng nhựa PLA gốc thực vật, không độc, không BPA và bo tròn cạnh sắc; phù hợp cho bé trên 3 tuổi.',
  },
  {
    question: 'Tôi có thể in 3D đồ chơi theo mẫu riêng không?',
    answer:
      'Được. Gửi ảnh, file 3D (STL/OBJ) hoặc ý tưởng, chúng tôi dựng mô hình 3D, báo giá và in theo yêu cầu.',
  },
  {
    question: 'Đồ chơi in 3D dùng chất liệu gì?',
    answer:
      'Chủ yếu là nhựa PLA an toàn cho trẻ em; với chi tiết cần độ bền cao chúng tôi dùng PETG chịu lực tốt.',
  },
  {
    question: 'Giá in 3D đồ chơi khoảng bao nhiêu?',
    answer:
      'Móc khóa từ 25.000₫, mô hình nhỏ từ 90.000₫, figure chi tiết từ 150.000₫; in theo mẫu riêng báo giá theo kích thước và độ phức tạp.',
  },
  {
    question: 'Thời gian giao hàng bao lâu?',
    answer:
      'Sản phẩm in theo đơn thường hoàn thiện trong vài ngày làm việc, sau đó giao toàn quốc qua đơn vị vận chuyển.',
  },
];

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  const data = {
    title: TITLE,
    subtitle: SUBTITLE,
    content: buildContent(),
    faq: FAQ,
    meta: { title: META_TITLE, description: META_DESCRIPTION },
  };

  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: SLUG } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });

  let categoryId: string | number;
  if (existing.docs.length > 0) {
    const doc = existing.docs[0]!;
    categoryId = doc.id;
    await payload.update({
      collection: 'categories',
      id: doc.id,
      overrideAccess: true,
      data,
    });
    console.log(`[payload] updated SEO landing category: ${SLUG}`);
  } else {
    const created = await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: { ...data, slug: SLUG },
    });
    categoryId = created.id;
    console.log(`[payload] created SEO landing category: ${TITLE} (${SLUG})`);
  }

  // Additively assign a handful of hero products to the landing category so the
  // money page isn't empty. Existing category assignments are preserved.
  const HERO_LIMIT = 8;
  const products = await payload.find({
    collection: 'products',
    where: { available: { equals: true } },
    sort: '-updatedAt',
    limit: HERO_LIMIT,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });

  let attached = 0;
  for (const product of products.docs) {
    const current = Array.isArray(product.category) ? product.category : [];
    const currentIds = current.map((value: unknown) =>
      value !== null && typeof value === 'object' && 'id' in value
        ? (value as { id: string | number }).id
        : (value as string | number),
    );
    if (currentIds.some((id) => String(id) === String(categoryId))) continue;

    await payload.update({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      data: { category: [...currentIds, categoryId] },
    });
    attached += 1;
  }

  console.log(`[payload] attached ${attached} hero product(s) to ${SLUG}.`);
  console.log('[payload] SEO landing seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[payload] failed to seed SEO landing: ${message}`);
    process.exit(1);
  });
