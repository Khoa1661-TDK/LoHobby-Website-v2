import type { Locale } from '@/i18n/routing';

export type InfoPage = {
  title: string;
  description: string;
  body: string;
};

/** Each info page carries content for every supported locale. */
type LocalizedInfoPage = Record<Locale, InfoPage>;

const infoPages: Record<string, LocalizedInfoPage> = {
  'in-3d-an-toan-cho-be': {
    vi: {
      title: 'Đồ chơi in 3D có an toàn cho bé không?',
      description:
        'Giải thích chất liệu nhựa PLA, PETG dùng trong in 3D đồ chơi và vì sao chúng an toàn cho trẻ em.',
      body:
        'Đồ chơi in 3D tại xưởng của chúng tôi được in chủ yếu từ nhựa PLA — loại nhựa sinh học có nguồn gốc từ tinh bột ngô, không chứa BPA, không mùi độc và được dùng phổ biến cho sản phẩm tiếp xúc trẻ em. Với các chi tiết cần độ bền và chịu lực cao hơn, chúng tôi dùng nhựa PETG, an toàn thực phẩm và khó vỡ. Mỗi sản phẩm đều được làm sạch bề mặt, bo tròn cạnh sắc và kiểm tra trước khi giao. Lưu ý chung: đồ chơi in 3D phù hợp cho bé trên 3 tuổi, tránh chi tiết nhỏ cho trẻ dưới 3 tuổi. Xem thêm sản phẩm tại trang Đồ chơi in 3D (/search/do-choi-in-3d) hoặc quy trình in 3D theo yêu cầu (/info/quy-trinh-in-3d-theo-yeu-cau).',
    },
    en: {
      title: 'Are 3D printed toys safe for children?',
      description:
        'An explanation of the PLA and PETG plastics used in 3D printed toys and why they are safe for children.',
      body:
        'Toys 3D printed at our workshop are made mainly from PLA — a bioplastic derived from corn starch that is BPA-free, odorless, and widely used for products that come into contact with children. For parts that need extra strength, we use PETG, which is food-safe and hard to break. Every product has its surface cleaned, sharp edges rounded, and is inspected before shipping. General note: 3D printed toys are suitable for children aged 3 and up; avoid small parts for children under 3. See more products on the 3D printed toys page (/search/do-choi-in-3d) or read about our custom 3D printing process (/info/quy-trinh-in-3d-theo-yeu-cau).',
    },
  },
  'quy-trinh-in-3d-theo-yeu-cau': {
    vi: {
      title: 'Quy trình in 3D đồ chơi theo yêu cầu',
      description:
        'Các bước nhận in 3D đồ chơi, mô hình và móc khóa theo mẫu riêng: từ gửi ý tưởng đến giao hàng toàn quốc.',
      body:
        'Bạn có mẫu riêng? Quy trình in 3D theo yêu cầu của chúng tôi gồm bốn bước. Bước 1 — Gửi mẫu hoặc ý tưởng: gửi ảnh, file 3D (STL/OBJ) hoặc mô tả sản phẩm bạn muốn. Bước 2 — Dựng và duyệt mô hình 3D: đội ngũ dựng/chỉnh file in, báo giá và xác nhận kích thước, màu sắc, chất liệu PLA hoặc PETG. Bước 3 — In và hoàn thiện: in 3D bằng công nghệ FDM, xử lý bề mặt, sơn (nếu cần) và kiểm tra chất lượng. Bước 4 — Giao hàng toàn quốc: đóng gói và giao qua đơn vị vận chuyển, thanh toán tiện lợi bằng VietQR. Tham khảo các sản phẩm có sẵn tại trang Đồ chơi in 3D (/search/do-choi-in-3d) và thông tin an toàn chất liệu (/info/in-3d-an-toan-cho-be).',
    },
    en: {
      title: 'Custom 3D printing process for toys',
      description:
        'The steps for custom 3D printing of toys, models, and keychains from your own design: from sending your idea to nationwide delivery.',
      body:
        'Have your own design? Our custom 3D printing process has four steps. Step 1 — Send your model or idea: send photos, a 3D file (STL/OBJ), or a description of the product you want. Step 2 — Model and review: our team builds or adjusts the print file, quotes the price, and confirms size, color, and material (PLA or PETG). Step 3 — Print and finish: we 3D print using FDM technology, treat the surface, paint if needed, and check quality. Step 4 — Nationwide delivery: we package and ship via a carrier, with convenient VietQR payment. Browse ready-made products on the 3D printed toys page (/search/do-choi-in-3d) and read our material safety notes (/info/in-3d-an-toan-cho-be).',
    },
  },
  support: {
    vi: {
      title: 'Hỗ trợ',
      description: 'Nhận trợ giúp về đơn hàng, vận chuyển và sản phẩm.',
      body:
        'Cần hỗ trợ? Liên hệ qua email hoặc điện thoại trong giờ làm việc. Chúng tôi thường phản hồi trong một ngày làm việc. Với câu hỏi về đơn hàng, vui lòng gửi kèm mã đơn để được hỗ trợ nhanh hơn.',
    },
    en: {
      title: 'Support',
      description: 'Get help with orders, shipping, and products.',
      body:
        'Need help? Contact us by email or phone during business hours. We usually respond within one business day. For order-related questions, please include your order code so we can help you faster.',
    },
  },
  'how-to-order': {
    vi: {
      title: 'Cách đặt hàng',
      description: 'Hướng dẫn từng bước đặt hàng trên cửa hàng.',
      body:
        'Duyệt danh mục, mở trang sản phẩm, chọn tùy chọn và thêm vào giỏ. Tại trang thanh toán, nhập thông tin giao hàng và thanh toán qua VietQR. Bạn sẽ nhận xác nhận sau khi thanh toán được xác minh.',
    },
    en: {
      title: 'How to order',
      description: 'A step-by-step guide to ordering from the store.',
      body:
        'Browse the catalog, open a product page, choose your options, and add to cart. At checkout, enter your shipping details and pay via VietQR. You will receive a confirmation once your payment is verified.',
    },
  },
  payment: {
    vi: {
      title: 'Hướng dẫn thanh toán',
      description: 'Cách VietQR và payOS hoạt động trên cửa hàng.',
      body:
        'Chúng tôi chấp nhận thanh toán qua VietQR bằng payOS. Sau khi đặt hàng, quét mã QR bằng app ngân hàng, xác nhận số tiền và hoàn tất chuyển khoản. Đơn hàng được xử lý sau khi thanh toán được xác nhận.',
    },
    en: {
      title: 'Payment guide',
      description: 'How VietQR and payOS work in the store.',
      body:
        'We accept VietQR payments through payOS. After placing your order, scan the QR code with your banking app, confirm the amount, and complete the transfer. Your order is processed once the payment is confirmed.',
    },
  },
  returns: {
    vi: {
      title: 'Đổi trả',
      description: 'Chính sách đổi trả và xử lý lỗi sản phẩm.',
      body:
        'Vì sản phẩm được làm theo đơn, đổi trả được xử lý từng trường hợp. Liên hệ trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị hư hỏng hoặc không đúng mô tả. Gửi kèm ảnh và mã đơn hàng.',
    },
    en: {
      title: 'Returns',
      description: 'Return policy and handling of product defects.',
      body:
        'Because products are made to order, returns are handled case by case. Contact us within 7 days of receiving your order if the product is damaged or not as described. Please include photos and your order code.',
    },
  },
  'track-order': {
    vi: {
      title: 'Theo dõi đơn hàng',
      description: 'Theo dõi đơn hàng từ lúc xử lý đến khi giao.',
      body:
        'Sau khi đặt hàng, dùng mã tham chiếu trong email xác nhận để kiểm tra trạng thái. Chúng tôi sẽ thông báo khi bắt đầu in, khi giao cho đơn vị vận chuyển và khi hàng đang được giao đến bạn.',
    },
    en: {
      title: 'Track your order',
      description: 'Track your order from processing to delivery.',
      body:
        'After placing your order, use the reference code in your confirmation email to check its status. We will notify you when printing starts, when it is handed to the carrier, and when it is on its way to you.',
    },
  },
  cookies: {
    vi: {
      title: 'Chính sách cookie',
      description: 'Cách website sử dụng cookie và công nghệ tương tự.',
      body:
        'Chúng tôi sử dụng cookie cần thiết để giỏ hàng, phiên đăng nhập và bảo mật hoạt động đúng cách — những cookie này không thể tắt. Khi bạn đồng ý, chúng tôi cũng dùng cookie phân tích để hiểu cách khách truy cập sử dụng website nhằm cải thiện trải nghiệm; các cookie này chỉ được kích hoạt sau khi bạn bấm "Chấp nhận tất cả" trên thanh thông báo cookie. Bạn có thể thay đổi lựa chọn bất cứ lúc nào bằng cách xóa cookie trong trình duyệt, hoặc quản lý cookie trực tiếp trong cài đặt trình duyệt. Chúng tôi không dùng cookie để bán dữ liệu cho bên thứ ba.',
    },
    en: {
      title: 'Cookie policy',
      description: 'How the website uses cookies and similar technologies.',
      body:
        'We use essential cookies so the cart, login session, and security work correctly — these cannot be turned off. With your consent, we also use analytics cookies to understand how visitors use the website so we can improve the experience; these are only activated after you click "Accept all" on the cookie banner. You can change your choice at any time by clearing cookies in your browser, or by managing cookies directly in your browser settings. We do not use cookies to sell data to third parties.',
    },
  },
  privacy: {
    vi: {
      title: 'Chính sách bảo mật',
      description: 'Cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân.',
      body:
        'Chúng tôi thu thập thông tin bạn cung cấp khi đặt hàng hoặc tạo tài khoản: họ tên, email, số điện thoại và địa chỉ giao hàng. Dữ liệu này chỉ được dùng để xử lý đơn hàng, liên hệ về đơn, gửi xác nhận và hỗ trợ sau bán. Thông tin thanh toán được xử lý an toàn qua đối tác cổng thanh toán (ví dụ payOS) — chúng tôi không lưu trữ số thẻ của bạn. Chúng tôi giữ dữ liệu đơn hàng trong thời gian cần thiết cho mục đích kế toán và bảo hành, và không bán dữ liệu của bạn cho bên thứ ba. Bạn có quyền yêu cầu xem, cập nhật hoặc xóa thông tin cá nhân của mình — hãy liên hệ qua trang Liên hệ và chúng tôi sẽ xử lý trong thời gian hợp lý.',
    },
    en: {
      title: 'Privacy policy',
      description: 'How we collect, use, and protect personal data.',
      body:
        'We collect the information you provide when placing an order or creating an account: full name, email, phone number, and shipping address. This data is used only to process orders, contact you about them, send confirmations, and provide after-sales support. Payment information is handled securely through our payment gateway partner (e.g. payOS) — we do not store your card numbers. We keep order data for as long as needed for accounting and warranty purposes, and we do not sell your data to third parties. You have the right to request access to, correction of, or deletion of your personal information — contact us via the Contact page and we will handle it within a reasonable time.',
    },
  },
  terms: {
    vi: {
      title: 'Điều khoản dịch vụ',
      description: 'Điều khoản sử dụng website và đặt hàng.',
      body:
        'Khi sử dụng website và đặt hàng, bạn đồng ý với các điều khoản sau. Giá sản phẩm được hiển thị bằng VND và có thể thay đổi mà không báo trước; giá áp dụng là giá tại thời điểm bạn đặt hàng. Vì phần lớn sản phẩm được in 3D theo đơn, thời gian sản xuất có thể thay đổi và sẽ được thông báo khi cần. Màu sắc và chi tiết bề mặt thực tế có thể chênh lệch nhẹ so với ảnh do đặc tính của công nghệ in 3D. Bạn cam kết cung cấp thông tin giao hàng chính xác; chúng tôi không chịu trách nhiệm cho việc giao trễ do thông tin sai. Mọi tranh chấp sẽ được giải quyết trên tinh thần thiện chí, ưu tiên thương lượng trực tiếp. Nội dung điều khoản có thể được cập nhật và phiên bản mới nhất luôn hiển thị trên trang này.',
    },
    en: {
      title: 'Terms of service',
      description: 'Terms for using the website and placing orders.',
      body:
        'By using the website and placing an order, you agree to the following terms. Product prices are shown in VND and may change without notice; the price that applies is the one at the time you place your order. Because most products are 3D printed to order, production times may vary and will be communicated when needed. Actual colors and surface details may differ slightly from the photos due to the nature of 3D printing. You agree to provide accurate shipping information; we are not responsible for late delivery caused by incorrect details. Any disputes will be resolved in good faith, with direct negotiation preferred. These terms may be updated, and the latest version is always shown on this page.',
    },
  },
};

export function getInfoPage(slug: string, locale: Locale): InfoPage | undefined {
  return infoPages[slug]?.[locale];
}

export function getAllInfoSlugs(): string[] {
  return Object.keys(infoPages);
}

/** An info page's slug plus its localized title & description — for index listings. */
export type InfoPageSummary = { slug: string } & Pick<InfoPage, 'title' | 'description'>;

/** Every info page resolved for a locale, in declaration order. */
export function getInfoPageSummaries(locale: Locale): InfoPageSummary[] {
  return Object.entries(infoPages).map(([slug, byLocale]) => ({
    slug,
    title: byLocale[locale].title,
    description: byLocale[locale].description,
  }));
}
