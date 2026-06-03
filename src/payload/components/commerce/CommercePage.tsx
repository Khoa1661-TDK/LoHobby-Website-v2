// src/payload/components/commerce/CommercePage.tsx — standardized layout
// wrapper for bespoke admin pages (coupons, gift cards, campaigns, reviews).
//
// Renders inside the Payload admin shell (Gutter + SetStepNav) and is styled
// by `.commerce-page*` in app/(payload)/custom.scss, riding Payload theme
// tokens so it tracks light/dark and brand changes. No Tailwind — utilities
// don't apply inside the admin; this matches the existing AnalyticsDashboard.
//
// Hook-free so it works as either a server component (list pages with a link
// CTA) or inside a client tree (form pages passing a submit button via the
// `actions` slot).
import { Gutter, SetStepNav } from '@payloadcms/ui';
import type { ReactElement, ReactNode } from 'react';

export type CommerceBreadcrumb = {
  label: string;
  url?: string;
};

export type CommercePageAction = {
  label: string;
  href: string;
  icon?: ReactNode;
};

type Props = {
  /** Small uppercase label above the title (e.g. "Marketing"). */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Admin breadcrumb. When provided, drives Payload's step nav. */
  breadcrumb?: CommerceBreadcrumb[];
  /** Convenience primary CTA rendered as a link (common on list pages). For a
   *  client-driven submit/publish button, use the `actions` slot instead. */
  primaryAction?: CommercePageAction;
  /** Arbitrary nodes rendered in the action zone, left of `primaryAction`
   *  (e.g. a form's Save button, a status pill, a secondary link). */
  actions?: ReactNode;
  /** Pins the header + action zone to the top while content scrolls. Default true. */
  sticky?: boolean;
  /** Optional row below the header for filters, search, or bulk-select controls. */
  toolbar?: ReactNode;
  children: ReactNode;
};

export function CommercePage({
  eyebrow,
  title,
  description,
  breadcrumb,
  primaryAction,
  actions,
  sticky = true,
  toolbar,
  children,
}: Props): ReactElement {
  const hasActions = Boolean(actions) || Boolean(primaryAction);
  const barClass = sticky
    ? 'commerce-page__bar commerce-page__bar--sticky'
    : 'commerce-page__bar';

  return (
    <Gutter>
      {breadcrumb && breadcrumb.length > 0 ? (
        <SetStepNav nav={breadcrumb.map((c) => ({ label: c.label, url: c.url }))} />
      ) : null}

      <div className="commerce-page">
        <header className={barClass}>
          <div className="commerce-page__heading">
            {eyebrow ? <p className="commerce-page__eyebrow">{eyebrow}</p> : null}
            <h1 className="commerce-page__title">{title}</h1>
            {description ? (
              <p className="commerce-page__description">{description}</p>
            ) : null}
          </div>

          {hasActions ? (
            <div className="commerce-page__actions">
              {actions}
              {primaryAction ? (
                <a
                  className="commerce-btn commerce-btn--primary"
                  href={primaryAction.href}
                >
                  {primaryAction.icon ? (
                    <span className="commerce-btn__icon" aria-hidden>
                      {primaryAction.icon}
                    </span>
                  ) : null}
                  {primaryAction.label}
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        {toolbar ? <div className="commerce-page__toolbar">{toolbar}</div> : null}

        <div className="commerce-page__body">{children}</div>
      </div>
    </Gutter>
  );
}

export default CommercePage;
