'use client';

import { FormEvent, useState, type ReactElement } from 'react';
import { toast } from 'sonner';

export default function FooterNewsletter(): ReactElement {
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email.');
      return;
    }
    toast.success('Đăng ký thành công! Chúng tôi sẽ liên hệ sớm.');
    setEmail('');
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-neutral-400">
        Nhận thông báo hàng mới, tái nhập kho và sản phẩm hobby qua email.
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4"
      >
        <label htmlFor="footer-email" className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Email
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="footer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@email.com"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-filament-500 focus:outline-none focus:ring-1 focus:ring-filament-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-filament-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-filament-600"
          >
            Đăng ký
          </button>
        </div>
      </form>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
        Khi đăng ký, bạn đồng ý nhận cập nhật từ chúng tôi. Có thể hủy đăng ký bất cứ lúc nào.
      </p>
    </div>
  );
}
