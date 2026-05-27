export type InfoPage = {
  title: string;
  description: string;
  body: string;
};

export const infoPages: Record<string, InfoPage> = {
  support: {
    title: 'Hỗ trợ',
    description: 'Nhận trợ giúp về đơn hàng, vận chuyển và sản phẩm.',
    body:
      'Cần hỗ trợ? Liên hệ qua email hoặc điện thoại trong giờ làm việc. Chúng tôi thường phản hồi trong một ngày làm việc. Với câu hỏi về đơn hàng, vui lòng gửi kèm mã đơn để được hỗ trợ nhanh hơn.',
  },
  'how-to-order': {
    title: 'Cách đặt hàng',
    description: 'Hướng dẫn từng bước đặt hàng trên cửa hàng.',
    body:
      'Duyệt danh mục, mở trang sản phẩm, chọn tùy chọn và thêm vào giỏ. Tại trang thanh toán, nhập thông tin giao hàng và thanh toán qua VietQR. Bạn sẽ nhận xác nhận sau khi thanh toán được xác minh.',
  },
  payment: {
    title: 'Hướng dẫn thanh toán',
    description: 'Cách VietQR và payOS hoạt động trên cửa hàng.',
    body:
      'Chúng tôi chấp nhận thanh toán qua VietQR bằng payOS. Sau khi đặt hàng, quét mã QR bằng app ngân hàng, xác nhận số tiền và hoàn tất chuyển khoản. Đơn hàng được xử lý sau khi thanh toán được xác nhận.',
  },
  returns: {
    title: 'Đổi trả',
    description: 'Chính sách đổi trả và xử lý lỗi sản phẩm.',
    body:
      'Vì sản phẩm được làm theo đơn, đổi trả được xử lý từng trường hợp. Liên hệ trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm bị hư hỏng hoặc không đúng mô tả. Gửi kèm ảnh và mã đơn hàng.',
  },
  'track-order': {
    title: 'Theo dõi đơn hàng',
    description: 'Theo dõi đơn hàng từ lúc xử lý đến khi giao.',
    body:
      'Sau khi đặt hàng, dùng mã tham chiếu trong email xác nhận để kiểm tra trạng thái. Chúng tôi sẽ thông báo khi bắt đầu in, khi giao cho đơn vị vận chuyển và khi hàng đang được giao đến bạn.',
  },
  cookies: {
    title: 'Chính sách cookie',
    description: 'Cách website sử dụng cookie và công nghệ tương tự.',
    body:
      'Chúng tôi dùng cookie cần thiết để giỏ hàng và phiên đăng nhập hoạt động. Cookie phân tích có thể được thêm sau để hiểu lưu lượng truy cập. Bạn có thể quản lý cookie trong cài đặt trình duyệt.',
  },
  privacy: {
    title: 'Chính sách bảo mật',
    description: 'Cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân.',
    body:
      'Chúng tôi thu thập thông tin bạn cung cấp khi thanh toán như tên, email, số điện thoại và địa chỉ giao hàng để xử lý đơn. Chúng tôi không bán dữ liệu của bạn. Liên hệ nếu bạn muốn cập nhật hoặc xóa thông tin.',
  },
  terms: {
    title: 'Điều khoản dịch vụ',
    description: 'Điều khoản sử dụng website và đặt hàng.',
    body:
      'Khi sử dụng website, bạn đồng ý với giá, thời gian sản xuất theo đơn và điều khoản thanh toán. Màu sắc sản phẩm có thể chênh lệch nhẹ so với ảnh. Nội dung trang sẽ được cập nhật.',
  },
};

export function getInfoPage(slug: string): InfoPage | undefined {
  return infoPages[slug];
}

export function getAllInfoSlugs(): string[] {
  return Object.keys(infoPages);
}
