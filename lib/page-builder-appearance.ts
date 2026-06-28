// lib/page-builder-appearance.ts — client-safe block appearance helpers.
//
// Split out of lib/page-builder.ts: that module imports server-only APIs
// (`revalidateTag`, `unstable_cache`, `getPayload`, `@payload-config`), and ES
// imports are hoisted — so a `'use client'` block value-importing
// `blockAppearanceClasses` from there would drag the server APIs into the
// client bundle and fail the build. Keep these pure (no server imports) so both
// client and server blocks can import them. lib/page-builder.ts re-exports them
// for existing server consumers.

export type BlockAppearance = {
  background?: 'theme' | 'light' | 'dark' | 'custom' | null;
  backgroundCustom?: string | null;
  backgroundCustomDark?: string | null;
  containerWidth?: 'narrow' | 'normal' | 'wide' | 'full' | 'custom' | null;
  maxWidthCustom?: string | null;
  paddingY?: 'compact' | 'base' | 'spacious' | 'none' | null;
  contentAlign?: 'left' | 'center' | 'right' | null;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | null;
  border?: boolean | null;
  scrollAnimation?: 'none' | 'reveal-up' | 'reveal-right' | 'scale-in' | null;
};

/** Map Payload appearance fields to Tailwind classes. */
export function blockAppearanceClasses(appearance: BlockAppearance): {
  section: string;
  container: string;
  style: Record<string, string>;
} {
  const bgClass = (() => {
    if (appearance.background === 'light') return 'bg-surface-raised text-ink';
    if (appearance.background === 'dark') return 'bg-ink text-surface';
    if (appearance.background === 'custom') return 'blk-custom-bg';
    return ''; // 'theme' inherits from the page surface
  })();

  const widthClass = (() => {
    switch (appearance.containerWidth) {
      case 'narrow':
        return 'mx-auto max-w-3xl';
      case 'wide':
        return 'mx-auto max-w-screen-2xl';
      case 'full':
        return '';
      case 'custom':
        return 'mx-auto blk-maxw';
      default:
        return 'mx-auto max-w-screen-xl';
    }
  })();

  const pyClass = (() => {
    switch (appearance.paddingY) {
      case 'compact':
        return 'py-8';
      case 'spacious':
        return 'py-24';
      case 'none':
        return '';
      default:
        return 'py-16';
    }
  })();

  const alignClass = (() => {
    switch (appearance.contentAlign) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return '';
    }
  })();

  const roundedClass = (() => {
    switch (appearance.rounded) {
      case 'sm':
        return 'rounded-sm overflow-hidden';
      case 'md':
        return 'rounded-md overflow-hidden';
      case 'lg':
        return 'rounded-lg overflow-hidden';
      case 'xl':
        return 'rounded-xl overflow-hidden';
      default:
        return '';
    }
  })();

  const borderClass = appearance.border ? 'border border-line' : '';

  const customStyle: Record<string, string> = {};
  if (appearance.background === 'custom' && appearance.backgroundCustom) {
    const light = appearance.backgroundCustom;
    customStyle['--blk-bg'] = light;
    customStyle['--blk-bg-dark'] = appearance.backgroundCustomDark || light;
  }
  if (appearance.containerWidth === 'custom' && appearance.maxWidthCustom) {
    const px = Number.parseInt(String(appearance.maxWidthCustom), 10);
    if (Number.isFinite(px) && px > 0) {
      customStyle['--blk-maxw'] = `${px}px`;
    }
  }

  return {
    section: [bgClass, pyClass, roundedClass, borderClass].filter(Boolean).join(' '),
    container: [widthClass, 'px-4', alignClass].filter(Boolean).join(' '),
    style: customStyle,
  };
}
