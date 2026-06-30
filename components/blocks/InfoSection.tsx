// components/blocks/InfoSection.tsx — footer-style info block: about blurb, contact,
// quick links, and social icons. Renders nothing if every column is empty.
import type { ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { SocialIcon, socialPlatformLabel } from '@/components/social/SocialIcon';

type LinkItem = { label?: string | null; href?: string | null };
type SocialItem = { platform?: string | null; url?: string | null };

type Props = {
  heading?: string | null;
  about?: string | null;
  contact?: {
    heading?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  links?: LinkItem[] | null;
  linksHeading?: string | null;
  social?: SocialItem[] | null;
} & BlockAppearance;

const COLUMN_HEADING =
  'font-display text-xs font-bold uppercase tracking-[0.2em] text-ink/50';

export default function InfoSectionBlock(props: Props): ReactElement | null {
  const { heading, about, contact, links, linksHeading, social } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const validLinks = (links ?? []).filter((l) => l?.label && l?.href);
  const validSocial = (social ?? []).filter((s) => s?.platform && s?.url);
  const hasContact = Boolean(
    contact?.address || contact?.phone || contact?.email,
  );
  const hasAbout = Boolean(about || heading);

  if (!hasAbout && !hasContact && validLinks.length === 0 && validSocial.length === 0) {
    return null;
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* About + social */}
          <div className="lg:col-span-2 lg:max-w-md">
            {heading ? (
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                {heading}
              </h2>
            ) : null}
            {about ? (
              <p className="mt-3 text-sm leading-relaxed text-ink/60">{about}</p>
            ) : null}
            {validSocial.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {validSocial.map((s, i) => {
                  const label = socialPlatformLabel(s.platform as string);
                  return (
                    <a
                      key={i}
                      href={s.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink/60 transition-colors hover:border-ink hover:text-ink"
                    >
                      <SocialIcon platform={s.platform as string} className="h-4 w-4 fill-current" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Contact */}
          {hasContact ? (
            <div>
              <h3 className={COLUMN_HEADING}>{contact?.heading || 'Contact'}</h3>
              <ul className="mt-5 space-y-3 text-sm text-ink/60">
                {contact?.address ? <li>{contact.address}</li> : null}
                {contact?.phone ? (
                  <li>
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, '')}`}
                      className="transition-colors hover:text-ink"
                    >
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
                {contact?.email ? (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      className="transition-colors hover:text-ink"
                    >
                      {contact.email}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {/* Quick links */}
          {validLinks.length > 0 ? (
            <div>
              <h3 className={COLUMN_HEADING}>{linksHeading || 'Quick Links'}</h3>
              <ul className="mt-5 space-y-3">
                {validLinks.map((l, i) => (
                  <li key={i}>
                    <Link
                      href={l.href as string}
                      className="text-sm text-ink/60 transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
