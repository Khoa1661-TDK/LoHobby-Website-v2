// components/layout/footer.tsx
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { ReactElement } from 'react';
import FooterNewsletter from '@/components/layout/footer-newsletter';
import { DEFAULT_SOCIAL_LINKS } from '@/lib/brand';
import { getFooterMenu, type NavColumn } from '@/lib/navigation';
import { getStoreBranding } from '@/lib/store-branding';

function FooterLinkList({ column }: { column: NavColumn }): ReactElement {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-warm-400">
        {column.heading}
      </h3>
      <ul className="mt-5 space-y-3">
        {column.links.map((link) => (
          <li key={`${link.label}:${link.href}`}>
            <Link
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="text-sm text-warm-400 transition-colors duration-200 hover:text-warm-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ label }: { label: string }): ReactElement {
  const normalized = label.toLowerCase();
  if (normalized.includes('tiktok')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
      </svg>
    );
  }
  if (normalized.includes('youtube')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }
  if (normalized.includes('instagram')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default async function Footer(): Promise<ReactElement> {
  const currentYear = new Date().getFullYear();
  const [branding, footerMenu] = await Promise.all([getStoreBranding(), getFooterMenu()]);
  const socialLinks =
    branding.socialLinks.length > 0 ? branding.socialLinks : DEFAULT_SOCIAL_LINKS;

  return (
    <footer className="mt-auto bg-warm-950">
      {/* Subtle top border gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-warm-700/50 to-transparent" />

      <div className="mx-auto max-w-screen-2xl px-4 py-14 md:py-16 lg:px-6">
        {/* Brand + contact */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:max-w-xs">
            <p className="font-display text-xl font-bold text-warm-50">
              {branding.storeName}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-warm-400">
              {branding.footer.description} {branding.footer.tagline}.
            </p>
            {branding.footer.origin ? (
              <span className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.3em] text-warm-600">
                {branding.footer.origin}
              </span>
            ) : null}

            <ul className="mt-6 space-y-4">
              <li className="flex gap-3 text-sm">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-warm-500" aria-hidden="true" />
                <span className="text-warm-400">{branding.contact.address}</span>
              </li>
              <li className="flex gap-3 text-sm">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-warm-500" aria-hidden="true" />
                <a
                  href={`tel:${branding.contact.phone.replace(/\s/g, '')}`}
                  className="text-warm-400 transition-colors duration-200 hover:text-warm-100"
                >
                  Hotline: {branding.contact.phone}
                </a>
              </li>
              <li className="flex gap-3 text-sm">
                <EnvelopeIcon className="mt-0.5 h-5 w-5 shrink-0 text-warm-500" aria-hidden="true" />
                <a
                  href={`mailto:${branding.contact.email}`}
                  className="text-warm-400 transition-colors duration-200 hover:text-warm-100"
                >
                  {branding.contact.email}
                </a>
              </li>
            </ul>

            {/* Social links */}
            <div className="mt-6 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={`${social.label}:${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-800 text-warm-400 transition-all duration-200 hover:border-warm-600 hover:text-warm-100 hover:bg-warm-800/50"
                >
                  <SocialIcon label={social.label} />
                </a>
              ))}
            </div>
          </div>

          {footerMenu.map((column) => (
            <FooterLinkList key={column.heading} column={column} />
          ))}

          {branding.footer.showNewsletter ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-warm-400">
                Newsletter
              </h3>
              <div className="mt-5">
                <FooterNewsletter />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-warm-900">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 py-6 text-xs text-warm-600 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p>
            &copy; {currentYear} {branding.storeName}. Bảo lưu mọi quyền.
          </p>
          {branding.footer.credit ? (
            <p className="text-warm-700">{branding.footer.credit}</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}