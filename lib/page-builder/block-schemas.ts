// lib/page-builder/block-schemas.ts — serializable descriptors of page-builder block fields.
// Derived from the same Payload Block definitions the Pages collection uses, so the
// custom builder panel can never drift from the collection schema.
import type { Block, Field } from 'payload';
import {
  Hero,
  FeaturedCollection,
  FeaturedProducts,
  RichText,
  ImageWithText,
  Gallery,
  Testimonials,
  LogoCloud,
  Newsletter,
  FAQ,
  PromoBanner,
  VideoEmbed,
  Divider,
  Recommendations,
  RecentlyViewed,
  Button,
  Text,
  SocialBar,
  Spacer,
  Columns,
  CallToAction,
  Stats,
  Quote,
  CardGrid,
  Banner,
  Steps,
  PricingTable,
  Countdown,
  Tabs,
  FeatureGrid,
  ProductShowcase,
  Reels,
  InfoSection,
  Marquee,
  Spotlight,
  YouTubeChannel,
  ReelCarousel,
} from '@/src/payload/blocks';
import { blockKeyField } from '@/src/payload/blocks/_identity';

export type FieldCondition = { field: string; equals: unknown };

export type FieldDescriptor = {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  relationTo?: string;
  /** Present for `relationship` fields. */
  hasMany?: boolean;
  /** Present for `number` fields with a configured lower bound. */
  min?: number;
  /** Present for `number` fields with a configured upper bound. */
  max?: number;
  /** Present for `array` and `group` fields. */
  fields?: FieldDescriptor[];
  /** Simplified, serializable condition (only the common siblingData equality form). */
  condition?: FieldCondition;
  /** Builder-only authoring aid: name of a sibling `relationship` (to `products`) whose
   * list price auto-fills this text field. Set via the Payload field's `custom` metadata. */
  autoFillPriceFrom?: string;
};

export type BlockSchema = {
  slug: string;
  label: string;
  imageURL?: string;
  fields: FieldDescriptor[];
};

const REGISTERED_BLOCKS: Block[] = [
  Hero,
  FeaturedCollection,
  FeaturedProducts,
  RichText,
  ImageWithText,
  Gallery,
  Testimonials,
  LogoCloud,
  Newsletter,
  FAQ,
  PromoBanner,
  VideoEmbed,
  Divider,
  Recommendations,
  RecentlyViewed,
  Button,
  Text,
  SocialBar,
  Spacer,
  Columns,
  CallToAction,
  Stats,
  Quote,
  CardGrid,
  Banner,
  Steps,
  PricingTable,
  Countdown,
  Tabs,
  FeatureGrid,
  ProductShowcase,
  Reels,
  InfoSection,
  Marquee,
  Spotlight,
  YouTubeChannel,
  ReelCarousel,
];

/** Probe a Payload `admin.condition` fn against synthetic siblingData to recover the
 * common `siblingData?.x === 'y'` shape as serializable data. Returns undefined when the
 * condition is absent or does not match the simple equality pattern. */
function describeCondition(field: Field): FieldCondition | undefined {
  const condition = (field as { admin?: { condition?: unknown } }).admin?.condition;
  if (typeof condition !== 'function') return undefined;

  // Find which sibling field name + value flips the condition true.
  // We can only recover simple equality conditions; complex ones fall back to always-visible.
  const fn = condition as (data: unknown, sibling: Record<string, unknown>) => unknown;
  // Heuristic: conditions gate on a single sibling field equal to a fixed value.
  // Appearance blocks use 'custom' (background -> backgroundCustom; containerWidth ->
  // maxWidthCustom). Site-header tabs gate sub-fields on the `kind` select.
  const probes: Array<{ field: string; values: readonly string[] }> = [
    { field: 'background', values: ['custom'] },
    { field: 'containerWidth', values: ['custom'] },
    { field: 'kind', values: ['home', 'all-products', 'category', 'custom', 'dropdown'] },
  ];
  for (const { field: candidate, values } of probes) {
    for (const value of values) {
      try {
        if (fn({}, { [candidate]: value }) && !fn({}, {})) {
          return { field: candidate, equals: value };
        }
      } catch {
        /* ignore non-conforming conditions */
      }
    }
  }
  return undefined;
}

function describeField(field: Field): FieldDescriptor | null {
  // Only named, value-bearing fields are editable in the panel.
  if (!('name' in field) || typeof field.name !== 'string') return null;

  const base: FieldDescriptor = {
    name: field.name,
    type: field.type,
  };

  if ('label' in field && typeof field.label === 'string') base.label = field.label;
  if ('required' in field && typeof field.required === 'boolean') base.required = field.required;
  if ('defaultValue' in field && typeof field.defaultValue !== 'function') {
    base.defaultValue = field.defaultValue as unknown;
  }
  if ('options' in field && Array.isArray(field.options)) {
    base.options = field.options
      .map((opt) =>
        typeof opt === 'object' && opt && 'value' in opt
          ? { label: String(opt.label ?? opt.value), value: String(opt.value) }
          : { label: String(opt), value: String(opt) },
      );
  }
  if (
    (field.type === 'upload' || field.type === 'relationship') &&
    'relationTo' in field &&
    typeof field.relationTo === 'string'
  ) {
    base.relationTo = field.relationTo;
  }
  if (field.type === 'relationship') {
    base.hasMany = 'hasMany' in field && field.hasMany === true;
  }
  if (field.type === 'number') {
    if ('min' in field && typeof field.min === 'number') base.min = field.min;
    if ('max' in field && typeof field.max === 'number') base.max = field.max;
  }
  if (
    (field.type === 'array' || field.type === 'group') &&
    'fields' in field &&
    Array.isArray(field.fields)
  ) {
    base.fields = field.fields
      .map(describeField)
      .filter((f): f is FieldDescriptor => f !== null);
  }
  const condition = describeCondition(field);
  if (condition) base.condition = condition;

  // Recover the builder-only auto-fill hint from the field's `custom` metadata.
  const custom = (field as { custom?: { autoFillPriceFrom?: unknown } }).custom;
  if (custom && typeof custom.autoFillPriceFrom === 'string') {
    base.autoFillPriceFrom = custom.autoFillPriceFrom;
  }

  return base;
}

function describeBlock(block: Block): BlockSchema {
  const label =
    typeof block.labels?.singular === 'string' ? block.labels.singular : block.slug;
  return {
    slug: block.slug,
    label,
    imageURL: block.imageURL,
    fields: (block.fields ?? [])
      .map(describeField)
      .filter((f): f is FieldDescriptor => f !== null),
  };
}

let cached: BlockSchema[] | null = null;

const SCHEMA_BLOCKS = REGISTERED_BLOCKS.map((block) => ({
  ...block,
  fields: [...(block.fields ?? []), blockKeyField],
}));

export function getBlockSchemas(): BlockSchema[] {
  if (!cached) cached = SCHEMA_BLOCKS.map(describeBlock);
  return cached;
}

export function getBlockSchema(slug: string): BlockSchema | null {
  return getBlockSchemas().find((s) => s.slug === slug) ?? null;
}

/**
 * Build a BlockSchema from an arbitrary list of Payload fields — used to drive the
 * page-builder FieldRenderer for non-block surfaces (e.g. the `site-header` global's
 * announcement + tabs). Reuses the same describeField logic so the panel can't drift
 * from the Payload field definitions.
 */
export function describeFieldsAsSchema(
  slug: string,
  label: string,
  fields: Field[],
): BlockSchema {
  return {
    slug,
    label,
    fields: fields.map(describeField).filter((f): f is FieldDescriptor => f !== null),
  };
}