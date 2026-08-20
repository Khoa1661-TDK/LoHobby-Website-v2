// components/console/ui/Button.tsx
//
// Two variants only. The primary action is ink itself — a filled black
// button with a white label — because the palette has no chromatic accent
// to spend on buttons.

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--adm-action)] text-[var(--adm-action-ink)] border border-transparent',
  secondary:
    'bg-[var(--adm-surface)] text-[var(--adm-ink)] border border-[var(--adm-line)] hover:bg-[var(--adm-raised)]',
  ghost: 'bg-transparent text-[var(--adm-ink-3)] border border-transparent hover:text-[var(--adm-ink)]',
};

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-1.5 rounded-[var(--adm-radius)] px-3 py-[7px] text-[12px] font-semibold transition disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}
