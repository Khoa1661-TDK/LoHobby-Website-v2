import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { SpecTag, BuildPlateGrid, LayerLineDivider } from '@/components/blocks/_primitives';

const WIDTHS = {
  narrow: 'max-w-3xl',
  normal: 'max-w-screen-xl',
  wide: 'max-w-screen-2xl',
} as const;

export function PageShell({
  children,
  width = 'normal',
  grid = false,
  className = '',
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  grid?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div className={`relative mx-auto ${WIDTHS[width]} px-4 ${className}`}>
      {grid ? <BuildPlateGrid /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function ContentSection({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <section className={`py-12 md:py-16 motion-safe:animate-reveal-up ${className}`}>
      {children}
    </section>
  );
}

export function StorefrontPageHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  actions,
  divider = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  actions?: ReactNode;
  divider?: boolean;
}): ReactElement {
  const alignment = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  return (
    <header className={`flex flex-col gap-4 ${alignment}`}>
      {eyebrow ? <SpecTag>{eyebrow}</SpecTag> : null}
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance text-warm-900 dark:text-warm-100 md:text-4xl lg:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-2xl text-base leading-relaxed text-warm-600 dark:text-warm-400 md:text-lg">
          {subtitle}
        </p>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
      {divider ? (
        <div className="mt-4 w-full max-w-[28rem]">
          <LayerLineDivider />
        </div>
      ) : null}
    </header>
  );
}

const PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-warm-900 px-6 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-300 hover:-translate-y-px hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200';
const SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-6 py-3 text-sm font-semibold text-warm-800 transition-all duration-300 hover:-translate-y-px hover:border-warm-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-warm-200';

type AnchorOrButton =
  | ({ as?: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>);

export function PrimaryButton(props: AnchorOrButton): ReactElement {
  const { as = 'a', className = '', ...rest } = props as { as?: 'a' | 'button'; className?: string };
  const cls = `${PRIMARY} ${className}`;
  return as === 'button' ? (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />
  ) : (
    <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />
  );
}

export function SecondaryButton(props: AnchorOrButton): ReactElement {
  const { as = 'a', className = '', ...rest } = props as { as?: 'a' | 'button'; className?: string };
  const cls = `${SECONDARY} ${className}`;
  return as === 'button' ? (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />
  ) : (
    <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />
  );
}
