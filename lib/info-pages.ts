export type InfoPage = {
  title: string;
  description: string;
  body: string;
};

export const infoPages: Record<string, InfoPage> = {
  'in-3d-an-toan-cho-be': {
    title: 'Đồ chơi in 3D có an toàn cho bé không?',
    description:
      'Giải thích chất liệu nhựa PLA, PETG dùng trong in 3D đồ chơi và vì sao chúng an toàn cho trẻ em.',
    body:
      'Đồ chơi in 3D tại xưởng của chúng tôi được in chủ yếu từ nhựa PLA — loại nhựa sinh học có nguồn gốc từ tinh bột ngô, không chứa BPA, không mùi độc và được dùng phổ biến cho sản phẩm tiếp xúc trẻ em. Với các chi tiết cần độ bền và chịu lực cao hơn, chúng tôi dùng nhựa PETG, an toàn thực phẩm và khó vỡ. Mỗi sản phẩm đều được làm sạch bề mặt, bo tròn cạnh sắc và kiểm tra trước khi giao. Lưu ý chung: đồ chơi in 3D phù hợp cho bé trên 3 tuổi, tránh chi tiết nhỏ cho trẻ dưới 3 tuổi. Xem thêm sản phẩm tại trang Đồ chơi in 3D (/search/do-choi-in-3d) hoặc quy trình in 3D theo yêu cầu (/info/quy-trinh-in-3d-theo-yeu-cau).',
  },
  'quy-trinh-in-3d-theo-yeu-cau': {
    title: 'Quy trình in 3D đồ chơi theo yêu cầu',
    description:
      'Các bước nhận in 3D đồ chơi, mô hình và móc khóa theo mẫu riêng: từ gửi ý tưởng đến giao hàng toàn quốc.',
    body:
      'Bạn có mẫu riêng? Quy trình in 3D theo yêu cầu của chúng tôi gồm bốn bước. Bước 1 — Gửi mẫu hoặc ý tưởng: gửi ảnh, file 3D (STL/OBJ) hoặc mô tả sản phẩm bạn muốn. Bước 2 — Dựng và duyệt mô hình 3D: đội ngũ dựng/chỉnh file in, báo giá và xác nhận kích thước, màu sắc, chất liệu PLA hoặc PETG. Bước 3 — In và hoàn thiện: in 3D bằng công nghệ FDM, xử lý bề mặt, sơn (nếu cần) và kiểm tra chất lượng. Bước 4 — Giao hàng toàn quốc: đóng gói và giao qua đơn vị vận chuyển, thanh toán tiện lợi bằng VietQR. Tham khảo các sản phẩm có sẵn tại trang Đồ chơi in 3D (/search/do-choi-in-3d) và thông tin an toàn chất liệu (/info/in-3d-an-toan-cho-be).',
  },
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
