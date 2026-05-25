// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import WelcomeToast from '@/components/welcome-toast';
import { baseUrl } from '@/lib/utils';
import './globals.css';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';
const description =
  'Hand-printed 3D toys — articulated figures, fidget gadgets, RPG dice, and modular playsets. Made to order in Vietnam, paid via VietQR.';
const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE
  ? `@${process.env.NEXT_PUBLIC_TWITTER_HANDLE.replace(/^@/, '')}`
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,
  applicationName: siteName,
  generator: 'Next.js',
  keywords: [
    '3D printed toys',
    '3D printed figures',
    'articulated toys',
    'print in place',
    'fidget toys',
    'RPG dice',
    'tabletop miniatures',
    'modular playset',
    'flexi toys',
    'PLA toys',
    'đồ chơi in 3D',
    'mô hình in 3D',
    'PolyToys',
    'VietQR',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: 'shopping',
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
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description,
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
    { media: '(prefers-color-scheme: light)', color: '#fff8f0' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1410' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <html lang="vi" className={GeistSans.variable}>
      <body className="bg-paper text-ink selection:bg-filament-200 selection:text-filament-900 dark:bg-neutral-950 dark:text-white dark:selection:bg-filament-500 dark:selection:text-white">
        <Navbar />
        <main>
          {children}
          <Toaster closeButton richColors />
          <WelcomeToast />
        </main>
      </body>
    </html>
  );
}
