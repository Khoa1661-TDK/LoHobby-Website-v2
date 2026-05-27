// components/layout/footer.tsx
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { ReactElement } from 'react';
import FooterNewsletter from '@/components/layout/footer-newsletter';
import {
  BRAND_DESCRIPTION_SHORT,
  BRAND_ORIGIN,
  BRAND_TAGLINE,
  getSiteName,
} from '@/lib/brand';

const contact = {
  address: '123 Workshop Lane, Quận 1, TP. Hồ Chí Minh, Việt Nam',
  phone: '+84 900 000 000',
  email: 'hello@lohobby.vn',
};

const socialLinks = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

const supportLinks = [
  { title: 'Trung tâm hỗ trợ', href: '/info/support' },
  { title: 'Cách đặt hàng', href: '/info/how-to-order' },
  { title: 'Hướng dẫn thanh toán', href: '/info/payment' },
  { title: 'Đổi trả', href: '/info/returns' },
  { title: 'Theo dõi đơn hàng', href: '/info/track-order' },
];

const policyLinks = [
  { title: 'Chính sách cookie', href: '/info/cookies' },
  { title: 'Chính sách bảo mật', href: '/info/privacy' },
  { title: 'Điều khoản dịch vụ', href: '/info/terms' },
];

function FooterLinkList({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string }[];
}): ReactElement {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer(): ReactElement {
  const currentYear = new Date().getFullYear();
  const siteName = getSiteName();

  return (
    <footer className="mt-auto bg-neutral-950 text-neutral-300">
      <div className="mx-auto max-w-screen-2xl px-4 py-12 md:py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:max-w-sm">
            <p className="font-serif text-lg font-bold text-white">{siteName}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {BRAND_DESCRIPTION_SHORT} {BRAND_TAGLINE}.
            </p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
              {BRAND_ORIGIN}
            </p>

            <ul className="mt-6 space-y-4">
              <li className="flex gap-3 text-sm">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                <span className="text-neutral-400">{contact.address}</span>
              </li>
              <li className="flex gap-3 text-sm">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-neutral-400 hover:text-white">
                  Hotline: {contact.phone}
                </a>
              </li>
              <li className="flex gap-3 text-sm">
                <EnvelopeIcon className="mt-0.5 h-5 w-5 shrink-0 text-white" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className="text-neutral-400 hover:text-white">
                  {contact.email}
                </a>
              </li>
            </ul>

            <div className="mt-6 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 transition hover:border-white hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterLinkList title="Hỗ trợ" links={supportLinks} />
          <FooterLinkList title="Chính sách" links={policyLinks} />

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">Bản tin</h3>
            <div className="mt-4">
              <FooterNewsletter />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {currentYear} {siteName}. Bảo lưu mọi quyền.
          </p>
          <p>Thiết kế &amp; phát triển bởi Trương Đăng Khoa</p>
        </div>
      </div>
    </footer>
  );
}
