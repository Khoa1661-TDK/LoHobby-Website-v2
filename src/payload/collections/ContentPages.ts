// src/payload/collections/ContentPages.ts — lightweight CMS page builder (Phase 3)
import type { CollectionConfig } from 'payload';
import { groups } from '@/src/payload/groups';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';

export const ContentPages: CollectionConfig = {
  slug: 'content-pages',
  labels: { singular: 'Content page', plural: 'Content pages' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'published', 'updatedAt'],
    group: groups.content.name,
    description: 'Marketing/landing pages rendered at /pages/[slug].',
  },
  access: payloadPublicReadAdminWrite,
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Published',
    },
    {
      name: 'layout',
      type: 'blocks',
      labels: { singular: 'Block', plural: 'Blocks' },
      blocks: [
        {
          slug: 'hero',
          labels: { singular: 'Hero', plural: 'Heroes' },
          fields: [
            { name: 'headline', type: 'text', required: true },
            { name: 'subheadline', type: 'textarea' },
            { name: 'ctaLabel', type: 'text' },
            { name: 'ctaHref', type: 'text' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          slug: 'richText',
          labels: { singular: 'Rich text', plural: 'Rich text' },
          fields: [{ name: 'content', type: 'textarea', required: true }],
        },
        {
          slug: 'cta',
          labels: { singular: 'CTA', plural: 'CTAs' },
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'body', type: 'textarea' },
            { name: 'buttonLabel', type: 'text', required: true },
            { name: 'buttonHref', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
};
