// components/checkout-form.tsx
'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Price from '@/components/price';
import { clearCartAction } from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

const PICKUP_ADDRESS = 'Trụ sở Lô Hobby, TP. Hồ Chí Minh, Việt Nam';

type DeliveryMethod = 'SHIPMENT' | 'PICKUP';
type PaymentMethod = 'COD' | 'PAY_ONLINE';

export type SavedAddress = {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  city: string;
  country: string;
  isDefault: boolean;
};

type CheckoutResponse =
  | {
      success: true;
      method: 'COD';
      orderCode: number;
      amount: number;
    }
  | {
      success: true;
      method: 'PAY_ONLINE';
      orderCode: number;
      amount: number;
      checkoutUrl: string;
      qrCode?: string;
    }
  | { error: string };

type Props = {
  cart: Cart;
  savedAddresses?: SavedAddress[];
  defaultName?: string;
};

function formatAddressLine(address: SavedAddress): string {
  return [address.addressLine, address.ward, address.district, address.city, address.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

export default function CheckoutForm({
  cart,
  savedAddresses = [],
  defaultName = '',
}: Props): ReactElement {
  const router = useRouter();

  const initialAddress = savedAddresses.find((entry) => entry.isDefault) ?? savedAddresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    initialAddress ? initialAddress.id : '',
  );
  const [name, setName] = useState<string>(initialAddress?.fullName ?? defaultName);
  const [phone, setPhone] = useState<string>(initialAddress?.phone ?? '');
  const [address, setAddress] = useState<string>(
    initialAddress ? formatAddressLine(initialAddress) : '',
  );
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('SHIPMENT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedAddressId) return;
    const match = savedAddresses.find((entry) => entry.id === selectedAddressId);
    if (!match) return;
    setName(match.fullName);
    setPhone(match.phone);
    setAddress(formatAddressLine(match));
  }, [selectedAddressId, savedAddresses]);

  const isPickup = deliveryMethod === 'PICKUP';

  const items = useMemo(
    () =>
      cart.lines.map((line) => ({
        productId: line.merchandiseId,
        quantity: line.quantity,
      })),
    [cart.lines],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Giỏ hàng trống.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length === 0) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (trimmedPhone.length === 0) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (deliveryMethod === 'SHIPMENT' && trimmedAddress.length === 0) {
      setError('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          items,
          customerInfo: {
            name: trimmedName,
            phone: trimmedPhone,
            address: deliveryMethod === 'SHIPMENT' ? trimmedAddress : null,
          },
          deliveryMethod,
          paymentMethod,
        }),
      });

      const data = (await res.json().catch(() => null)) as CheckoutResponse | null;

      if (!res.ok || !data || 'error' in data) {
        const message =
          data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Thanh toán thất bại. Vui lòng thử lại.';
        throw new Error(message);
      }

      await clearCartAction();

      if (data.method === 'PAY_ONLINE') {
        window.location.assign(data.checkoutUrl);
        return;
      }

      router.replace(`/checkout/success?orderCode=${data.orderCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-6">
        {/* Contact info */}
        <Section title="Thông tin liên hệ" subtitle="Để chúng tôi liên hệ về đơn hàng này.">
          {savedAddresses.length > 0 && (
            <div className="mb-4">
              <Field label="Dùng địa chỉ đã lưu" htmlFor="checkout-saved-address">
                <select
                  id="checkout-saved-address"
                  value={selectedAddressId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSelectedAddressId(next);
                    if (next === '') {
                      setName(defaultName);
                      setPhone('');
                      setAddress('');
                    }
                  }}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <option value="">Nhập địa chỉ mới…</option>
                  {savedAddresses.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                      {entry.isDefault ? ' (mặc định)' : ''} — {entry.fullName} ·{' '}
                      {formatAddressLine(entry)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Chọn địa chỉ đã lưu sẽ điền sẵn các trường bên dưới — bạn vẫn có thể chỉnh sửa.
                </p>
              </Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ tên" htmlFor="checkout-name">
              <input
                id="checkout-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="checkout-phone">
              <input
                id="checkout-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </Field>
          </div>
        </Section>

        {/* Delivery method */}
        <Section title="Hình thức giao hàng" subtitle="Chọn nơi bạn muốn nhận hàng.">
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              name="delivery"
              value="SHIPMENT"
              checked={deliveryMethod === 'SHIPMENT'}
              onChange={() => setDeliveryMethod('SHIPMENT')}
              title="Giao tận nhà"
              description="Giao hàng tiêu chuẩn toàn quốc."
              icon={<TruckIcon />}
            />
            <OptionCard
              name="delivery"
              value="PICKUP"
              checked={deliveryMethod === 'PICKUP'}
              onChange={() => setDeliveryMethod('PICKUP')}
              title="Nhận tại cửa hàng"
              description="Đến lấy tại trụ sở TP. Hồ Chí Minh."
              icon={<StoreIcon />}
            />
          </div>

          <div className="mt-4">
            {isPickup ? (
              <div
                role="status"
                className="rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100"
              >
                <p className="font-semibold">Địa điểm nhận hàng</p>
                <p className="mt-1">{PICKUP_ADDRESS}</p>
                <p className="mt-2 text-xs text-spool-700 dark:text-spool-200">
                  Chúng tôi sẽ nhắn tin qua số điện thoại trên khi đơn sẵn sàng để bạn đến lấy.
                </p>
              </div>
            ) : (
              <Field label="Địa chỉ giao hàng" htmlFor="checkout-address">
                <textarea
                  id="checkout-address"
                  required
                  autoComplete="street-address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, phường, quận, tỉnh/thành"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </Field>
            )}
          </div>
        </Section>

        {/* Payment method */}
        <Section title="Hình thức thanh toán" subtitle="Chọn cách bạn muốn thanh toán.">
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              name="payment"
              value="COD"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
              title="Thanh toán khi nhận hàng (COD)"
              description="Trả tiền mặt khi nhận hàng."
              icon={<CashIcon />}
            />
            <OptionCard
              name="payment"
              value="PAY_ONLINE"
              checked={paymentMethod === 'PAY_ONLINE'}
              onChange={() => setPaymentMethod('PAY_ONLINE')}
              title="Thanh toán ngay qua VietQR / payOS"
              description="Chuyển khoản ngân hàng nhanh bằng mã QR."
              icon={<QrIcon />}
            />
          </div>
        </Section>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>

      {/* Order summary */}
      <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>

        <ul className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {cart.lines.length === 0 ? (
            <li className="py-3 text-neutral-500 dark:text-neutral-400">Giỏ hàng trống.</li>
          ) : (
            cart.lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{line.product.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    SL {line.quantity}
                  </p>
                </div>
                <Price
                  className="shrink-0 text-right"
                  amount={line.lineTotal.amount}
                  currencyCode={line.lineTotal.currencyCode}
                />
              </li>
            ))
          )}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          <div className="flex justify-between">
            <dt className="text-neutral-500 dark:text-neutral-400">Tạm tính</dt>
            <dd>
              <Price
                amount={cart.cost.subtotalAmount.amount}
                currencyCode={cart.cost.subtotalAmount.currencyCode}
              />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500 dark:text-neutral-400">Phí vận chuyển</dt>
            <dd className="text-neutral-500 dark:text-neutral-400">
              {isPickup ? 'Miễn phí (nhận tại cửa hàng)' : 'Tính sau'}
            </dd>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
            <dt>Tổng cộng</dt>
            <dd>
              <Price
                amount={cart.cost.totalAmount.amount}
                currencyCode={cart.cost.totalAmount.currencyCode}
              />
            </dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={submitting || cart.lines.length === 0}
          className="mt-6 w-full rounded-full bg-filament-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {submitting
            ? 'Đang đặt hàng…'
            : paymentMethod === 'PAY_ONLINE'
              ? 'Tiếp tục thanh toán VietQR'
              : 'Đặt hàng (COD)'}
        </button>

        <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
          {paymentMethod === 'PAY_ONLINE'
            ? 'Bạn sẽ được chuyển đến payOS để hoàn tất thanh toán.'
            : 'Chúng tôi sẽ thu tiền mặt khi giao hàng.'}
        </p>
      </aside>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  icon: ReactElement;
}): ReactElement {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition ${
        checked
          ? 'border-filament-500 bg-filament-50 ring-2 ring-filament-500/30 dark:bg-filament-900/20'
          : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          checked
            ? 'bg-filament-500 text-white'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
        <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          checked
            ? 'border-filament-500 bg-filament-500'
            : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800'
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </label>
  );
}

function TruckIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0M19.5 18.75a1.5 1.5 0 0 1-3 0M3 5.25h11.25v9.75H3zm11.25 3h3l3 3v3.75h-6z"
      />
    </svg>
  );
}

function StoreIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.75 4.5 4.5h15L21 9.75M3 9.75v9.75h18V9.75M3 9.75a3 3 0 0 0 6 0m0 0a3 3 0 0 0 6 0m0 0a3 3 0 0 0 6 0"
      />
    </svg>
  );
}

function CashIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5h18v9H3zM3 10.5h18M7.5 13.5h.008v.008H7.5zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  );
}

function QrIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75h6v6h-6zm10.5 0h6v6h-6zm-10.5 10.5h6v6h-6zm10.5 0h2.25v2.25h-2.25zm3.75 0H21v2.25h-2.25zm-3.75 3.75H21v2.25h-6.75zM7.5 7.5h.008v.008H7.5zm10.5 0h.008v.008H18zM7.5 18h.008v.008H7.5z"
      />
    </svg>
  );
}
