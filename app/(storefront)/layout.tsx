// app/(storefront)/layout.tsx
import { Playfair_Display } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import Providers from '@/components/providers';
import WelcomeToast from '@/components/welcome-toast';
import {
  BRAND_DESCRIPTION,
  BRAND_TAGLINE,
  getSiteName,
} from '@/lib/brand';
import { baseUrl } from '@/lib/utils';
import '../globals.css';

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
});

const siteName = getSiteName();
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE
  ? `@${process.env.NEXT_PUBLIC_TWITTER_HANDLE.replace(/^@/, '')}`
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: siteName,
  generator: 'Next.js',
  keywords: [
    'móc khóa',
    'mô hình 3D',
    'mô hình figure',
    'mô hình lắp ráp',
    'đồ chơi mini',
    'cửa hàng hobby Việt Nam',
    'Lô Hobby',
    'mô hình Việt Nam',
    BRAND_TAGLINE,
    'VietQR',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: 'mua sắm',
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
    description: BRAND_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: BRAND_DESCRIPTION,
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
    icon: '/icon',
    apple: '/icon',
    shortcut: '/icon',
  },
  manifest: '/manifest.webmanifest',
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  return (
    <html lang="vi" className={`${GeistSans.variable} ${playfair.variable}`}>
      <body className="bg-paper text-ink selection:bg-neutral-200 selection:text-black dark:bg-neutral-950 dark:text-white dark:selection:bg-neutral-700 dark:selection:text-white">
        <Providers>
          <Navbar />
          <main>
            {children}
            <Toaster closeButton richColors />
            <WelcomeToast />
          </main>
        </Providers>
      </body>
    </html>
  );
}
