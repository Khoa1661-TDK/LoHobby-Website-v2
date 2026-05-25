// components/grid/index.tsx
import clsx from 'clsx';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

function Grid(props: ComponentProps<'ul'>): ReactElement {
  return (
    <ul {...props} className={clsx('grid grid-flow-row gap-4', props.className)}>
      {props.children}
    </ul>
  );
}

function GridTileItem({
  className,
  children,
  ...rest
}: { className?: string; children?: ReactNode } & ComponentProps<'li'>): ReactElement {
  return (
    <li
      {...rest}
      className={clsx('aspect-square transition-opacity', className)}
    >
      {children}
    </li>
  );
}

Grid.Item = GridTileItem;

export default Grid;
