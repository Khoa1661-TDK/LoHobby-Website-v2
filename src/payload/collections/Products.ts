// src/payload/collections/Products.ts
import type {
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
  Validate,
} from 'payload';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import {
  loadMediaDoc,
  mediaDocToStored,
  type StoredImage,
} from '@/lib/product-image-snapshot';
import { slugifyVietnamese, resolveCollectionSlug } from '@/lib/slugify';

const coerceVndInteger: FieldHook = ({ value }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.round(numeric));
};

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (!data) return data;

  const slug = await resolveCollectionSlug(req.payload, 'products', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
    data.slug = slug;
  }

  return data;
};

/** Copy upload picks into storedImage / storedGallery so products keep URLs after media is deleted. */
const snapshotProductImages: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data) return data;

  const title = typeof data.title === 'string' ? data.title : 'Sản phẩm';

  if (data.image !== undefined && data.image !== null) {
    const media = await loadMediaDoc(req.payload, data.image);
    const stored = mediaDocToStored(media, title);
    if (stored) {
      data.storedImage = stored;
    }
  }

  if (Array.isArray(data.gallery)) {
    const storedGallery: StoredImage[] = [];

    for (const item of data.gallery) {
      if (!item || typeof item !== 'object') continue;
      const media = await loadMediaDoc(req.payload, (item as { media?: unknown }).media);
      const stored = mediaDocToStored(media, title);
      if (stored) {
        storedGallery.push(stored);
      }
    }

    data.storedGallery = storedGallery;
  }

  return data;
};

function hasStoredImageUrl(stored: unknown): boolean {
  return (
    typeof stored === 'object' &&
    stored !== null &&
    'url' in stored &&
    typeof (stored as { url?: unknown }).url === 'string' &&
    (stored as { url: string }).url.trim().length > 0
  );
}

const validateProductImage: Validate = (value, args) => {
  if (value) return true;

  const { data } = args;
  const originalDoc = (args as { originalDoc?: { storedImage?: unknown } }).originalDoc;

  const stored =
    (data && typeof data === 'object' && 'storedImage' in data
      ? (data as { storedImage?: unknown }).storedImage
      : undefined) ?? originalDoc?.storedImage;

  if (hasStoredImageUrl(stored)) return true;

  return 'Vui lòng chọn ảnh sản phẩm.';
};

const storedImageFields = [
  {
    name: 'url',
    type: 'text' as const,
  },
  {
    name: 'alt',
    type: 'text' as const,
  },
  {
    name: 'width',
    type: 'number' as const,
  },
  {
    name: 'height',
    type: 'number' as const,
  },
];

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'slug', 'price', 'available', 'updatedAt'],
    description: 'Tạo sản phẩm tại đây, sau đó gán vào Danh mục để hiển thị trên trang chủ.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle, snapshotProductImages],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      admin: {
        description:
          'Nơi sản phẩm được liệt kê (mục trang chủ, bộ lọc tìm kiếm). Hãy tạo danh mục trong mục Danh mục trước.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Tự động tạo từ tiêu đề khi để trống. Có thể chỉnh sửa thủ công — lưu sẽ chuẩn hóa thành dạng URL.',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value !== 'string' || !value.trim()) return value;
            return slugifyVietnamese(value);
          },
        ],
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        step: 1,
        description: 'Giá trị VND (số nguyên). Ví dụ: 150000 tương ứng 150.000₫.',
      },
      hooks: {
        beforeValidate: [coerceVndInteger],
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Khi bỏ chọn, sản phẩm sẽ ẩn khỏi cửa hàng.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      validate: validateProductImage,
      admin: {
        description:
          'Chọn ảnh từ thư viện Media. URL được lưu vào sản phẩm khi bạn lưu — có thể xóa file Media sau đó.',
      },
    },
    {
      name: 'storedImage',
      type: 'group',
      admin: {
        readOnly: true,
        description: 'Bản sao URL ảnh trên sản phẩm (tự động khi lưu). Cửa hàng dùng trường này.',
      },
      fields: storedImageFields,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Ảnh bổ sung',
      fields: [
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'storedGallery',
      type: 'array',
      label: 'Ảnh bổ sung (đã lưu)',
      admin: {
        readOnly: true,
        description: 'Bản sao URL gallery — tự động khi lưu sản phẩm.',
      },
      fields: storedImageFields,
    },
  ],
};
