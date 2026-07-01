// components/blocks/Marquee.tsx — seamless scrolling text strip.
// Reuses the `animate-marquee`/`animate-marquee-reverse` keyframes (tailwind.config.ts)
// which translate by -50%, so the track is duplicated to loop without a visible seam.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Item = { text?: string | null };
type Props = {
  items?: Item[] | null;
  speed?: 'slow' | 'normal' | 'fast' | null;
  direction?: 'left' | 'right' | null;
} & BlockAppearance;

const DURATION: Record<string, string> = {
  slow: '60s',
  normal: '40s',
  fast: '22s',
};

export default function MarqueeBlock(props: Props): ReactElement | null {
  const { items, speed = 'normal', direction = 'left' } = props;
  const phrases = (items ?? [])
    .map((it) => it?.text?.trim())
    .filter((t): t is string => Boolean(t));
  if (phrases.length === 0) return null;

  const { section, style } = blockAppearanceClasses(props);
  // Default (Theme/unset) paints the brand-blue strip like the mockup; an explicit
  // Light/Dark/Custom background from the appearance panel overrides it.
  const isDefaultBackground = !props.background || props.background === 'theme';
  const stripBg = isDefaultBackground ? 'bg-accent text-white' : '';
  const animationClass =
    direction === 'right' ? 'motion-safe:animate-marquee-reverse' : 'motion-safe:animate-marquee';
  const duration = DURATION[speed ?? 'normal'] ?? DURATION.normal;

  // Two identical tracks side by side; the -50% translate lands the second exactly
  // where the first began, so the loop is seamless. The second is aria-hidden so
  // screen readers announce the phrases only once.
  const Track = ({ hidden }: { hidden: boolean }): ReactElement => (
    <ul
      className={`flex shrink-0 items-center gap-10 pr-10 ${animationClass}`}
      aria-hidden={hidden}
    >
      {phrases.map((text, i) => (
        <li
          key={i}
          className="flex items-center gap-10 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em]"
        >
          {text}
          <span aria-hidden="true" className="opacity-50">
            &bull;
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      className={`overflow-hidden ${stripBg} ${section}`.trim()}
      style={{ ...style, ['--marquee-duration' as string]: duration }}
    >
      <div className="flex w-max py-3">
        <Track hidden={false} />
        <Track hidden={true} />
      </div>
    </section>
  );
}
