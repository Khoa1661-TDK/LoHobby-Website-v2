'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useEffect, useState, type ReactElement } from 'react';
import { CONSENT_EVENT, hasAnalyticsConsent } from '@/components/cookie-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Loads Google Analytics 4 only after the visitor has accepted analytics
 * cookies. Page views are tracked on client-side navigations.
 */
export default function Analytics(): ReactElement | null {
  const [consented, setConsented] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setConsented(hasAnalyticsConsent());
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setConsented(detail === 'accepted');
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!consented || !GA_ID || typeof window.gtag !== 'function') return;
    const query = searchParams.toString();
    const page = query ? `${pathname}?${query}` : pathname;
    window.gtag('event', 'page_view', { page_path: page });
  }, [consented, pathname, searchParams]);

  useReportWebVitals((metric) => {
    if (!GA_ID || typeof window.gtag !== 'function') return;
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  });

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
