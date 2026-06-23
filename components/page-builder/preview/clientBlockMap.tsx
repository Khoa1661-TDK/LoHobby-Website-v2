// components/page-builder/preview/clientBlockMap.tsx — client-safe renderer for the
// presentational page-builder blocks. These 14 components have no server-only imports,
// so they can render inside the preview iframe's client tree and repaint instantly when
// the editor pushes new layout state over postMessage.
//
// IMPORTANT: this deliberately does NOT reuse components/blocks/RenderBlocks.tsx — that
// module statically imports the 4 async server data blocks (FeaturedCollection,
// FeaturedProducts, Recommendations, RecentlyViewed). Pulling it into a client module
// would drag those async server components into the client bundle and break the build.
// Data blocks are rendered server-side via DataBlockSlot instead. When adding a new
// presentational block, register it here AND in RenderBlocks.
import type { ComponentType, ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';

import HeroBlock from '@/components/blocks/Hero';
import RichTextBlock from '@/components/blocks/RichText';
import ImageWithTextBlock from '@/components/blocks/ImageWithText';
import GalleryBlock from '@/components/blocks/Gallery';
import TestimonialsBlock from '@/components/blocks/Testimonials';
import LogoCloudBlock from '@/components/blocks/LogoCloud';
import NewsletterBlock from '@/components/blocks/Newsletter';
import FAQBlock from '@/components/blocks/FAQ';
import PromoBannerBlock from '@/components/blocks/PromoBanner';
import VideoEmbedBlock from '@/components/blocks/VideoEmbed';
import DividerBlock from '@/components/blocks/Divider';
import ButtonBlock from '@/components/blocks/Button';
import TextBlock from '@/components/blocks/Text';
import SocialBarBlock from '@/components/blocks/SocialBar';

// Block types that fetch data on the server and therefore cannot render from layout
// state alone in the browser. PreviewClient routes these to DataBlockSlot.
export const DATA_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'featuredCollection',
  'featuredProducts',
  'recommendations',
  'recentlyViewed',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlockComponent = ComponentType<any>;

const CLIENT_BLOCK_MAP: Record<string, AnyBlockComponent> = {
  hero: HeroBlock,
  richText: RichTextBlock,
  imageWithText: ImageWithTextBlock,
  gallery: GalleryBlock,
  testimonials: TestimonialsBlock,
  logoCloud: LogoCloudBlock,
  newsletter: NewsletterBlock,
  faq: FAQBlock,
  promoBanner: PromoBannerBlock,
  videoEmbed: VideoEmbedBlock,
  divider: DividerBlock,
  button: ButtonBlock,
  text: TextBlock,
  socialBar: SocialBarBlock,
};

/** Render a presentational block in the client tree. Returns null for data blocks
 *  (handled by DataBlockSlot) and unknown block types. */
export function renderClientBlock(block: PageBlock): ReactElement | null {
  const Component = CLIENT_BLOCK_MAP[block.blockType];
  if (!Component) return null;
  return <Component {...(block as Record<string, unknown>)} />;
}
