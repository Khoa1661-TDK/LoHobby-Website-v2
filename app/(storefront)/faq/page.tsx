import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import { getSiteName } from '@/lib/brand';
import { buildFaqJsonLd, buildWebPageJsonLd, jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();
const canonical = '/faq';
const PAGE_TITLE = 'Câu hỏi thường gặp';
const PAGE_DESCRIPTION =
  'Giải đáp các câu hỏi thường gặp về đặt hàng, thanh toán, vận chuyển, đổi trả và sản phẩm in 3D tại ' +
  `${siteName}.`;

type FaqItem = { question: string; answer: string };

const faqs: FaqItem[] = [
  {
    question: 'Làm thế nào để đặt hàng?',
    answer:
      'Duyệt danh mục, mở trang sản phẩm, chọn tùy chọn và thêm vào giỏ. Tại trang thanh toán, nhập thông tin giao hàng và thanh toán qua VietQR. Bạn sẽ nhận xác nhận sau khi thanh toán được xác minh.',
  },
  {
    question: 'Cửa hàng hỗ trợ những hình thức thanh toán nào?',
    answer:
      'Chúng tôi chấp nhận thanh toán qua VietQR bằng payOS. Sau khi đặt hàng, quét mã QR bằng app ngân hàng, xác nhận số tiền và hoàn tất chuyển khoản. Đơn hàng được xử lý sau khi thanh toán được xác nhận.',
  },
  {
    question: 'Tôi có thể đặt hàng mà không cần tài khoản không?',
    answer:
      'Có. Bạn có thể thanh toán với tư cách khách bằng email và thông tin giao hàng, không bắt buộc tạo tài khoản. Việc đăng ký tài khoản giúp bạn theo dõi đơn hàng và lưu sản phẩm yêu thích dễ dàng hơn.',
  },
  {
    question: 'Đồ chơi in 3D có an toàn cho bé không?',
    answer:
      'Sản phẩm được in chủ yếu từ nhựa PLA — nhựa sinh học không chứa BPA — và PETG an toàn thực phẩm cho chi tiết cần độ bền. Mỗi sản phẩm được làm sạch, bo cạnh sắc và kiểm tra trước khi giao. Đồ chơi in 3D phù hợp cho bé trên 3 tuổi.',
  },
  {
    question: 'Tôi có thể đặt in 3D theo mẫu riêng không?',
    answer:
      'Có. Gửi ảnh, file 3D (STL/OBJ) hoặc mô tả ý tưởng, đội ngũ sẽ dựng mô hình, báo giá, in và hoàn thiện rồi giao hàng toàn quốc. Xem chi tiết tại trang Quy trình in 3D theo yêu cầu.',
  },
  {
    question: 'Chính sách đổi trả như thế nào?',
    answer:
      'Vì sản phẩm được làm theo đơn, đổi trả được xử lý từng trường hợp. Vui lòng liên hệ trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị hư hỏng hoặc không đúng mô tả, kèm ảnh và mã đơn hàng.',
  },
  {
    question: 'Làm sao để theo dõi đơn hàng?',
    answer:
      'Sau khi đặt hàng, dùng mã tham chiếu trong email xác nhận để kiểm tra trạng thái. Chúng tôi thông báo khi bắt đầu in, khi giao cho đơn vị vận chuyển và khi hàng đang được giao đến bạn.',
  },
];

const RELATED_LINKS: { label: string; href: string }[] = [
  { label: 'Cách đặt hàng', href: '/info/how-to-order' },
  { label: 'Hướng dẫn thanh toán', href: '/info/payment' },
  { label: 'Đổi trả', href: '/info/returns' },
  { label: 'Theo dõi đơn hàng', href: '/info/track-order' },
  { label: 'Quy trình in 3D theo yêu cầu', href: '/info/quy-trinh-in-3d-theo-yeu-cau' },
  { label: 'Liên hệ', href: '/contact' },
];

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical },
  openGraph: {
    type: 'website',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(canonical),
    siteName,
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function FaqPage(): ReactElement {
  const faqJsonLd = buildFaqJsonLd(faqs);
  const webPageJsonLd = buildWebPageJsonLd({
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    path: canonical,
  });

  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(faqJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{PAGE_TITLE}</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">{PAGE_DESCRIPTION}</p>

        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                {faq.question}
                <span className="text-neutral-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Xem thêm</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {RELATED_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-neutral-600 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Footer />
    </>
  );
}
