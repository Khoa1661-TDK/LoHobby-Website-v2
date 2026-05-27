// src/payload/collections/Categories.ts

import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { payloadPublicReadAdminWrite } from '@/lib/payload-access';

import { resolveCollectionSlug, slugifyVietnamese } from '@/lib/slugify';



const autoSlugFromTitle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {

  if (!data) return data;



  const slug = await resolveCollectionSlug(req.payload, 'categories', {

    title: typeof data.title === 'string' ? data.title : undefined,

    slug: typeof data.slug === 'string' ? data.slug : undefined,

    excludeId: operation === 'update' ? originalDoc?.id : undefined,

  });



  if (slug) {

    data.slug = slug;

  }



  return data;

};



export const Categories: CollectionConfig = {

  slug: 'categories',

  admin: {

    useAsTitle: 'title',

    defaultColumns: ['title', 'slug', 'updatedAt'],

    description:

      'Danh mục cửa hàng. Gán sản phẩm vào danh mục từ mục Sản phẩm.',

  },

  access: payloadPublicReadAdminWrite,

  hooks: {

    beforeChange: [autoSlugFromTitle],

  },

  fields: [

    {

      name: 'title',

      type: 'text',

      required: true,

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

      name: 'subtitle',

      type: 'textarea',

      admin: {

        description: 'Dòng mô tả ngắn hiển thị trên trang chủ và tiêu đề trang danh mục.',

      },

    },

  ],

};

