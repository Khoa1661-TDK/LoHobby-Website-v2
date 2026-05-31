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
      'Chúng tôi sử dụng cookie cần thiết để giỏ hàng, phiên đăng nhập và bảo mật hoạt động đúng cách — những cookie này không thể tắt. Khi bạn đồng ý, chúng tôi cũng dùng cookie phân tích để hiểu cách khách truy cập sử dụng website nhằm cải thiện trải nghiệm; các cookie này chỉ được kích hoạt sau khi bạn bấm "Chấp nhận tất cả" trên thanh thông báo cookie. Bạn có thể thay đổi lựa chọn bất cứ lúc nào bằng cách xóa cookie trong trình duyệt, hoặc quản lý cookie trực tiếp trong cài đặt trình duyệt. Chúng tôi không dùng cookie để bán dữ liệu cho bên thứ ba.',
  },
  privacy: {
    title: 'Chính sách bảo mật',
    description: 'Cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân.',
    body:
      'Chúng tôi thu thập thông tin bạn cung cấp khi đặt hàng hoặc tạo tài khoản: họ tên, email, số điện thoại và địa chỉ giao hàng. Dữ liệu này chỉ được dùng để xử lý đơn hàng, liên hệ về đơn, gửi xác nhận và hỗ trợ sau bán. Thông tin thanh toán được xử lý an toàn qua đối tác cổng thanh toán (ví dụ payOS) — chúng tôi không lưu trữ số thẻ của bạn. Chúng tôi giữ dữ liệu đơn hàng trong thời gian cần thiết cho mục đích kế toán và bảo hành, và không bán dữ liệu của bạn cho bên thứ ba. Bạn có quyền yêu cầu xem, cập nhật hoặc xóa thông tin cá nhân của mình — hãy liên hệ qua trang Liên hệ và chúng tôi sẽ xử lý trong thời gian hợp lý.',
  },
  terms: {
    title: 'Điều khoản dịch vụ',
    description: 'Điều khoản sử dụng website và đặt hàng.',
    body:
      'Khi sử dụng website và đặt hàng, bạn đồng ý với các điều khoản sau. Giá sản phẩm được hiển thị bằng VND và có thể thay đổi mà không báo trước; giá áp dụng là giá tại thời điểm bạn đặt hàng. Vì phần lớn sản phẩm được in 3D theo đơn, thời gian sản xuất có thể thay đổi và sẽ được thông báo khi cần. Màu sắc và chi tiết bề mặt thực tế có thể chênh lệch nhẹ so với ảnh do đặc tính của công nghệ in 3D. Bạn cam kết cung cấp thông tin giao hàng chính xác; chúng tôi không chịu trách nhiệm cho việc giao trễ do thông tin sai. Mọi tranh chấp sẽ được giải quyết trên tinh thần thiện chí, ưu tiên thương lượng trực tiếp. Nội dung điều khoản có thể được cập nhật và phiên bản mới nhất luôn hiển thị trên trang này.',
  },
};

export function getInfoPage(slug: string): InfoPage | undefined {
  return infoPages[slug];
}

export function getAllInfoSlugs(): string[] {
  return Object.keys(infoPages);
}
