// components/blocks/Divider.tsx
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { LayerLineDivider } from './_primitives';

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

  // The default ("line") style gets the maker-identity layer-line treatment;
  // dashed/gradient keep a simple rule styled with the new line/ink tokens.
  if (dividerStyle === 'line') {
    return (
      <section className={section} style={style} role="separator" aria-orientation="horizontal">
        <div className={container}>
          {showIcon ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <LayerLineDivider />
              </div>
              <svg
                className="h-5 w-5 text-ink/60"
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
              <div className="flex-1">
                <LayerLineDivider />
              </div>
            </div>
          ) : (
            <LayerLineDivider />
          )}
        </div>
      </section>
    );
  }

  const lineClass =
    dividerStyle === 'dashed'
      ? 'border-t-2 border-dashed border-line'
      : 'h-px bg-gradient-to-r from-transparent via-line to-transparent border-0';

  return (
    <section className={section} style={style} role="separator" aria-orientation="horizontal">
      <div className={container}>
        {showIcon ? (
          <div className="flex items-center gap-4">
            <hr className={`flex-1 ${lineClass}`} />
            <svg
              className="h-5 w-5 text-ink/60"
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