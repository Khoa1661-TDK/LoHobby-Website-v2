import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import {
  BRAND_DESCRIPTION,
  BRAND_ORIGIN,
  BRAND_TAGLINE,
  getSiteName,
} from '@/lib/brand';
import { jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();
const title = 'Về chúng tôi';
const description = `${siteName} là xưởng in 3D đồ chơi, mô hình, figure và móc khóa tại Việt Nam. ${BRAND_TAGLINE}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    title,
    description,
    url: absoluteUrl('/about'),
    siteName,
  },
  twitter: { card: 'summary_large_image', title, description },
};

const values = [
  {
    title: 'In theo yêu cầu',
    body: 'Mỗi sản phẩm được in 3D theo đơn bằng công nghệ FDM, cho phép cá nhân hóa kích thước, màu sắc và chi tiết.',
  },
  {
    title: 'Chất liệu an toàn',
    body: 'Chúng tôi dùng nhựa PLA sinh học và PETG bền chắc, xử lý bề mặt kỹ lưỡng và bo tròn cạnh sắc trước khi giao.',
  },
  {
    title: 'Bảo hành tận tâm',
    body: `${BRAND_TAGLINE}. Nếu sản phẩm gặp vấn đề, chúng tôi sẽ hỗ trợ đổi trả hoặc in lại.`,
  },
  {
    title: 'Giao hàng toàn quốc',
    body: 'Đóng gói cẩn thận và giao qua đối tác vận chuyển trên cả nước, thanh toán tiện lợi bằng VietQR.',
  },
];

export default function AboutPage(): ReactElement {
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description,
    url: absoluteUrl('/about'),
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-filament-600 dark:text-filament-300">
          {BRAND_ORIGIN}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Câu chuyện của {siteName}
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">{BRAND_DESCRIPTION}</p>

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <p>
            {siteName} bắt đầu từ niềm đam mê với mô hình và đồ chơi tự chế. Từ một chiếc máy in 3D
            trong phòng làm việc, chúng tôi dần xây dựng một xưởng nhỏ chuyên in figure, mô hình lắp
            ráp, móc khóa và quà tặng cá nhân hóa cho cộng đồng hobby Việt Nam.
          </p>
          <p>
            Chúng tôi tin rằng một sản phẩm tốt không chỉ đẹp mà còn phải bền và an toàn. Vì vậy mỗi
            đơn hàng đều được kiểm tra thủ công trước khi đến tay bạn.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <h2 className="text-base font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Khám phá sản phẩm
          </Link>
          <Link
            href="/contact"
            className="inline-flex rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-neutral-500 dark:border-neutral-700"
          >
            Liên hệ với chúng tôi
          </Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
