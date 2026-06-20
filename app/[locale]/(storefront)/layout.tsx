// app/[locale]/(storefront)/layout.tsx
import { Fraunces, Inter, Plus_Jakarta_Sans, Roboto, Space_Grotesk, Space_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { Suspense } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import { routing } from '@/i18n/routing';
import AnnouncementBanner from '@/components/layout/announcement-banner';
import { Navbar } from '@/components/layout/navbar';
import Analytics from '@/components/analytics';
import SessionTracker from '@/components/analytics/session-tracker';
import BrandTheme from '@/components/brand-theme';
import CookieConsent from '@/components/cookie-consent';
import Providers from '@/components/providers';
import PwaInstallPrompt from '@/components/pwa-install-prompt';
import WelcomeToast from '@/components/welcome-toast';
import LiveChatWidget from '@/components/chat/live-chat-widget';
import { getStoreBranding } from '@/lib/store-branding';
import { getChatConfig } from '@/lib/store-settings';
import { baseUrl } from '@/lib/utils';
import '../../globals.css';

// The storefront layout fetches store branding, chat config, and navigation
// from Payload (Postgres) on every request, so the whole storefront renders
// dynamically. This also keeps the production image build free of any database
// dependency — nothing under this layout is prerendered at build time.
export const dynamic = 'force-dynamic';

type LocaleParams = { locale: string };

const OG_LOCALES: Record<string, string> = { vi: 'vi_VN', en: 'en_US' };

export function generateStaticParams(): LocaleParams[] {
  return routing.locales.map((locale) => ({ locale }));
}

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jakarta',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE
  ? `@${process.env.NEXT_PUBLIC_TWITTER_HANDLE.replace(/^@/, '')}`
  : undefined;

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const branding = await getStoreBranding();
  const siteName = branding.storeName;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: branding.description,
    applicationName: siteName,
    generator: 'Next.js',
    keywords: [siteName, branding.tagline, branding.storeSubtitle ?? ''].filter(Boolean),
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[locale] ?? OG_LOCALES[routing.defaultLocale],
      url: baseUrl,
      siteName,
      title: siteName,
      description: branding.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: branding.description,
      ...(twitterHandle ? { creator: twitterHandle, site: twitterHandle } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: branding.faviconUrl ?? '/icon',
      apple: branding.faviconUrl ?? '/icon',
      shortcut: branding.faviconUrl ?? '/icon',
    },
    manifest: '/manifest.webmanifest',
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await getStoreBranding();
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: branding.primaryColor },
    ],
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<LocaleParams>;
}): Promise<ReactElement> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enable static rendering for this locale segment.
  setRequestLocale(locale);

  const [branding, messages, t, chatConfig] = await Promise.all([
    getStoreBranding(),
    getMessages(),
    getTranslations('common'),
    getChatConfig(),
  ]);

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${fraunces.variable} ${inter.variable} ${roboto.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <BrandTheme branding={branding} />
        <script
          // Apply the saved theme before paint to avoid a flash of the wrong theme.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {/* Warm up DNS for payment gateways the user is redirected to at checkout. */}
        <link rel="dns-prefetch" href="https://payment.momo.vn" />
        <link rel="dns-prefetch" href="https://vnpayment.vn" />
        <link rel="dns-prefetch" href="https://openapi.zalopay.vn" />
        <link rel="dns-prefetch" href="https://api-merchant.payos.vn" />
      </head>
      <body className="bg-warm-50 font-sans text-warm-900 antialiased dark:bg-warm-950 dark:text-warm-100">
        <NextIntlClientProvider messages={messages}>
          <Providers branding={branding}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white dark:focus:bg-white dark:focus:text-black"
            >
              {t('skipToContent')}
            </a>
            <Navbar />
            <AnnouncementBanner />
            <main id="main-content">
              {children}
              <Toaster closeButton richColors />
              <WelcomeToast />
            </main>
            <CookieConsent />
            <PwaInstallPrompt />
            <LiveChatWidget config={chatConfig} />
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
            <SessionTracker />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
