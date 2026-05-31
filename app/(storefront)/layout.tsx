// app/(storefront)/layout.tsx
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import AnnouncementBanner from '@/components/layout/announcement-banner';
import { Navbar } from '@/components/layout/navbar';
import Analytics from '@/components/analytics';
import BrandTheme from '@/components/brand-theme';
import CookieConsent from '@/components/cookie-consent';
import Providers from '@/components/providers';
import PwaInstallPrompt from '@/components/pwa-install-prompt';
import WelcomeToast from '@/components/welcome-toast';
import { getStoreBranding } from '@/lib/store-branding';
import { baseUrl } from '@/lib/utils';
import '../globals.css';

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

const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE
  ? `@${process.env.NEXT_PUBLIC_TWITTER_HANDLE.replace(/^@/, '')}`
  : undefined;

export async function generateMetadata(): Promise<Metadata> {
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
      locale: 'vi_VN',
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
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const branding = await getStoreBranding();

  return (
    <html
      lang="vi"
      className={`${jakarta.variable} ${fraunces.variable}`}
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
      <body className="bg-paper font-sans text-ink selection:bg-neutral-200 selection:text-black dark:bg-neutral-950 dark:text-white dark:selection:bg-neutral-700 dark:selection:text-white">
        <Providers branding={branding}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white dark:focus:bg-white dark:focus:text-black"
          >
            Bỏ qua tới nội dung
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
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
