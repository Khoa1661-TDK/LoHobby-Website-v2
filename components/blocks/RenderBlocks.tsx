// components/blocks/RenderBlocks.tsx
import type { ComponentProps, ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import RevealOnScroll from './RevealOnScroll';

import HeroBlock from './Hero';
import FeaturedCollectionBlock from './FeaturedCollection';
import FeaturedProductsBlock from './FeaturedProducts';
import RichTextBlock from './RichText';
import ImageWithTextBlock from './ImageWithText';
import GalleryBlock from './Gallery';
import TestimonialsBlock from './Testimonials';
import LogoCloudBlock from './LogoCloud';
import NewsletterBlock from './Newsletter';
import FAQBlock from './FAQ';
import PromoBannerBlock from './PromoBanner';
import VideoEmbedBlock from './VideoEmbed';
import DividerBlock from './Divider';
import RecommendationsBlock from './Recommendations';
import RecentlyViewedBlock from './RecentlyViewed';
import ButtonBlock from './Button';
import TextBlock from './Text';
import SocialBarBlock from './SocialBar';
import SpacerBlock from './Spacer';
import ColumnsBlock from './Columns';
import CallToActionBlock from './CallToAction';
import StatsBlock from './Stats';
import QuoteBlock from './Quote';
import CardGridBlock from './CardGrid';
import BannerBlock from './Banner';
import StepsBlock from './Steps';
import PricingTableBlock from './PricingTable';
import CountdownBlock from './Countdown';
import TabsBlock from './Tabs';
import FeatureGridBlock from './FeatureGrid';

type Props = {
  blocks: PageBlock[];
};

export default function RenderBlocks({ blocks }: Props): ReactElement {
  if (!blocks || blocks.length === 0) {
    return <></>;
  }

  return (
    <>
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </>
  );
}

/** Cast a loosely-typed CMS block to a block component's props. The admin schema
 *  guarantees the shape, but the generated union and the hand-authored component
 *  props don't structurally line up, so we bridge them here in one place. */
function asProps<T>(block: PageBlock): T {
  return block as unknown as T;
}

function BlockRenderer({ block }: { block: PageBlock }): ReactElement | null {
  const inner = renderInner(block);
  if (!inner) return null;
  const animate = (block as { animate?: string | null }).animate;
  if (animate && animate !== 'none') {
    return <RevealOnScroll animate={animate}>{inner}</RevealOnScroll>;
  }
  return inner;
}

function renderInner(block: PageBlock): ReactElement | null {
  switch (block.blockType) {
    case 'hero':
      return <HeroBlock {...asProps<ComponentProps<typeof HeroBlock>>(block)} />;
    case 'featuredCollection':
      return (
        <FeaturedCollectionBlock
          {...asProps<ComponentProps<typeof FeaturedCollectionBlock>>(block)}
        />
      );
    case 'featuredProducts':
      return (
        <FeaturedProductsBlock
          {...asProps<ComponentProps<typeof FeaturedProductsBlock>>(block)}
        />
      );
    case 'richText':
      return <RichTextBlock {...asProps<ComponentProps<typeof RichTextBlock>>(block)} />;
    case 'imageWithText':
      return (
        <ImageWithTextBlock {...asProps<ComponentProps<typeof ImageWithTextBlock>>(block)} />
      );
    case 'gallery':
      return <GalleryBlock {...asProps<ComponentProps<typeof GalleryBlock>>(block)} />;
    case 'testimonials':
      return (
        <TestimonialsBlock {...asProps<ComponentProps<typeof TestimonialsBlock>>(block)} />
      );
    case 'logoCloud':
      return <LogoCloudBlock {...asProps<ComponentProps<typeof LogoCloudBlock>>(block)} />;
    case 'newsletter':
      return <NewsletterBlock {...asProps<ComponentProps<typeof NewsletterBlock>>(block)} />;
    case 'faq':
      return <FAQBlock {...asProps<ComponentProps<typeof FAQBlock>>(block)} />;
    case 'promoBanner':
      return <PromoBannerBlock {...asProps<ComponentProps<typeof PromoBannerBlock>>(block)} />;
    case 'videoEmbed':
      return <VideoEmbedBlock {...asProps<ComponentProps<typeof VideoEmbedBlock>>(block)} />;
    case 'divider':
      return <DividerBlock {...asProps<ComponentProps<typeof DividerBlock>>(block)} />;
    case 'recommendations':
      return <RecommendationsBlock {...asProps<ComponentProps<typeof RecommendationsBlock>>(block)} />;
    case 'recentlyViewed':
      return <RecentlyViewedBlock {...asProps<ComponentProps<typeof RecentlyViewedBlock>>(block)} />;
    case 'button':
      return <ButtonBlock {...asProps<ComponentProps<typeof ButtonBlock>>(block)} />;
    case 'text':
      return <TextBlock {...asProps<ComponentProps<typeof TextBlock>>(block)} />;
    case 'socialBar':
      return <SocialBarBlock {...asProps<ComponentProps<typeof SocialBarBlock>>(block)} />;
    case 'spacer':
      return <SpacerBlock {...asProps<ComponentProps<typeof SpacerBlock>>(block)} />;
    case 'columns':
      return <ColumnsBlock {...asProps<ComponentProps<typeof ColumnsBlock>>(block)} />;
    case 'callToAction':
      return <CallToActionBlock {...asProps<ComponentProps<typeof CallToActionBlock>>(block)} />;
    case 'stats':
      return <StatsBlock {...asProps<ComponentProps<typeof StatsBlock>>(block)} />;
    case 'quote':
      return <QuoteBlock {...asProps<ComponentProps<typeof QuoteBlock>>(block)} />;
    case 'cardGrid':
      return <CardGridBlock {...asProps<ComponentProps<typeof CardGridBlock>>(block)} />;
    case 'banner':
      return <BannerBlock {...asProps<ComponentProps<typeof BannerBlock>>(block)} />;
    case 'steps':
      return <StepsBlock {...asProps<ComponentProps<typeof StepsBlock>>(block)} />;
    case 'pricingTable':
      return <PricingTableBlock {...asProps<ComponentProps<typeof PricingTableBlock>>(block)} />;
    case 'countdown':
      return <CountdownBlock {...asProps<ComponentProps<typeof CountdownBlock>>(block)} />;
    case 'tabs':
      return <TabsBlock {...asProps<ComponentProps<typeof TabsBlock>>(block)} />;
    case 'featureGrid':
      return <FeatureGridBlock {...asProps<ComponentProps<typeof FeatureGridBlock>>(block)} />;
    default:
      return null;
  }
}