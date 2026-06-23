// components/blocks/Spacer.tsx — empty vertical spacer.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | null;
} & BlockAppearance;

const HEIGHT_CLASS: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'h-4',
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-20',
  xl: 'h-32',
};

export default function SpacerBlock(props: Props): ReactElement {
  const { height = 'md' } = props;
  const { style } = blockAppearanceClasses(props);

  return (
    <div
      aria-hidden="true"
      className={`w-full ${HEIGHT_CLASS[height ?? 'md']}`}
      style={style}
    />
  );
}
