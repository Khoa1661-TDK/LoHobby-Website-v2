// components/blocks/Divider.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  style?: 'line' | 'dashed' | 'space' | 'gradient' | null;
  showIcon?: boolean;
} & BlockAppearance;

export default function DividerBlock(props: Props): ReactElement {
  const { style: dividerStyle = 'line', showIcon = false } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (dividerStyle === 'space') {
    return (
      <div
        className={section}
        style={style}
        role="separator"
        aria-orientation="horizontal"
      />
    );
  }

  const lineClass = (() => {
    switch (dividerStyle) {
      case 'dashed':
        return 'border-t-2 border-dashed border-warm-300 dark:border-warm-700';
      case 'gradient':
        return 'h-px bg-gradient-to-r from-transparent via-warm-400 to-transparent border-0';
      default:
        return 'border-t border-warm-200 dark:border-warm-800';
    }
  })();

  return (
    <section className={section} style={style} role="separator" aria-orientation="horizontal">
      <div className={container}>
        {showIcon ? (
          <div className="flex items-center gap-4">
            <hr className={`flex-1 ${lineClass}`} />
            <svg
              className="h-5 w-5 text-warm-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v12m6-6H6"
              />
            </svg>
            <hr className={`flex-1 ${lineClass}`} />
          </div>
        ) : (
          <hr className={lineClass} />
        )}
      </div>
    </section>
  );
}