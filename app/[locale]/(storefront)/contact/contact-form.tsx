'use client';

import { useRef, useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { submitContactAction } from './actions';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ContactForm(): ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitContactAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Đã gửi! Chúng tôi sẽ phản hồi sớm.');
      setDone(true);
      formRef.current?.reset();
    });
  };

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <p className="font-semibold">Cảm ơn bạn đã liên hệ!</p>
        <p className="mt-1">
          Tin nhắn của bạn đã được gửi. Chúng tôi thường phản hồi trong vòng một ngày làm việc.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 inline-flex rounded-full border border-emerald-300 px-4 py-2 text-xs font-medium"
        >
          Gửi tin nhắn khác
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
            Họ tên
          </label>
          <input id="contact-name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="contact-email" name="email" type="email" required className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-order" className="mb-1 block text-sm font-medium">
          Mã đơn hàng <span className="text-neutral-400">(tùy chọn)</span>
        </label>
        <input id="contact-order" name="orderCode" type="text" className={inputClass} />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
          Nội dung
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className={inputClass}
          placeholder="Chúng tôi có thể giúp gì cho bạn?"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {isPending ? 'Đang gửi…' : 'Gửi tin nhắn'}
      </button>
    </form>
  );
}
