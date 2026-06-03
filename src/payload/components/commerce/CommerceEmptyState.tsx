// src/payload/components/commerce/CommerceEmptyState.tsx — friendly empty
// state for the commerce pages: subtle icon chip, copy, and a primary CTA to
// create the first item. Styled by `.commerce-empty*` in custom.scss.
import type { ReactElement, ReactNode } from 'react';
import type { CommercePageAction } from './CommercePage';

type Props = {
  /** Subtle illustrative icon (e.g. a lucide-react glyph). */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Primary CTA rendered as a link (e.g. "Create your first coupon"). */
  action?: CommercePageAction;
  /** Escape hatch for a client-driven button when a link won't do. Rendered
   *  below the description in place of (or alongside) `action`. */
  children?: ReactNode;
};

export function CommerceEmptyState({
  icon,
  title,
  description,
  action,
  children,
}: Props): ReactElement {
  return (
    <div className="commerce-empty" role="status">
      {icon ? (
        <span className="commerce-empty__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <h2 className="commerce-empty__title">{title}</h2>
      {description ? (
        <p className="commerce-empty__description">{description}</p>
      ) : null}
      {action || children ? (
        <div className="commerce-empty__action">
          {children}
          {action ? (
            <a className="commerce-btn commerce-btn--primary" href={action.href}>
              {action.icon ? (
                <span className="commerce-btn__icon" aria-hidden>
                  {action.icon}
                </span>
              ) : null}
              {action.label}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CommerceEmptyState;
