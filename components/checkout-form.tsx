// components/checkout-form.tsx
'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Price from '@/components/price';
import { clearCartAction } from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';
import type { CheckoutPaymentMethod, PaymentMethodKind } from '@/lib/payment-methods';
import {
  computeShippingQuote,
  extractShippingRegion,
  type ShippingQuoteSettings,
} from '@/lib/shipping-quote';
import { computeTaxAmount, type TaxSettings } from '@/lib/tax';

type DeliveryMethod = 'SHIPMENT' | 'PICKUP';

export type CheckoutShippingPreview = Pick<
  ShippingQuoteSettings,
  | 'flatRateVnd'
  | 'freeShippingThresholdVnd'
  | 'pickupAddress'
  | 'pickupInstructions'
  | 'shipmentEnabled'
  | 'pickupEnabled'
  | 'zones'
>;

export type CheckoutTaxPreview = TaxSettings;

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
      method: PaymentMethodKind;
      orderCode: number;
      amount: number;
      checkoutUrl?: string;
      qrCode?: string;
    }
  | { error: string };

type Props = {
  cart: Cart;
  paymentMethods: CheckoutPaymentMethod[];
  shipping: CheckoutShippingPreview;
  tax: CheckoutTaxPreview;
  checkoutNote?: string | null;
  savedAddresses?: SavedAddress[];
  defaultName?: string;
  /** Guests must provide an email so we can send the order confirmation. */
  requireEmail?: boolean;
};

function formatAddressLine(address: SavedAddress): string {
  return [address.addressLine, address.ward, address.district, address.city, address.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function estimateShippingVnd(
  shipping: CheckoutShippingPreview,
  deliveryMethod: DeliveryMethod,
  subtotalVnd: number,
  shippingRegion: string | null,
): number {
  const quote = computeShippingQuote(
    shipping,
    deliveryMethod,
    subtotalVnd,
    shippingRegion,
  );
  if ('error' in quote) return 0;
  return quote.shippingAmount;
}

export default function CheckoutForm({
  cart,
  paymentMethods,
  shipping,
  tax,
  checkoutNote = null,
  savedAddresses = [],
  defaultName = '',
  requireEmail = false,
}: Props): ReactElement {
  const router = useRouter();

  const initialAddress = savedAddresses.find((entry) => entry.isDefault) ?? savedAddresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    initialAddress ? initialAddress.id : '',
  );
  const [name, setName] = useState<string>(initialAddress?.fullName ?? defaultName);
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>(initialAddress?.phone ?? '');
  const [address, setAddress] = useState<string>(
    initialAddress ? formatAddressLine(initialAddress) : '',
  );
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    shipping.shipmentEnabled ? 'SHIPMENT' : 'PICKUP',
  );
  const [paymentMethodKey, setPaymentMethodKey] = useState<string>(
    paymentMethods[0]?.key ?? '',
  );
  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedMethod = paymentMethods.find((method) => method.key === paymentMethodKey) ?? null;
  const selectedKind = selectedMethod?.kind ?? null;

  useEffect(() => {
    if (!shipping.shipmentEnabled && shipping.pickupEnabled) {
      setDeliveryMethod('PICKUP');
    } else if (shipping.shipmentEnabled && !shipping.pickupEnabled) {
      setDeliveryMethod('SHIPMENT');
    }
  }, [shipping.shipmentEnabled, shipping.pickupEnabled]);

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
        variantSku: line.variantSku,
        quantity: line.quantity,
      })),
    [cart.lines],
  );

  const subtotalVnd = useMemo(
    () => Number.parseInt(cart.cost.subtotalAmount.amount, 10) || 0,
    [cart.cost.subtotalAmount.amount],
  );

  const shippingRegion = useMemo(
    () => (deliveryMethod === 'SHIPMENT' ? extractShippingRegion(address) : null),
    [address, deliveryMethod],
  );

  const shippingVnd = useMemo(
    () => estimateShippingVnd(shipping, deliveryMethod, subtotalVnd, shippingRegion),
    [shipping, deliveryMethod, subtotalVnd, shippingRegion],
  );

  const estimatedTaxVnd = useMemo(
    () => computeTaxAmount(tax, subtotalVnd),
    [tax, subtotalVnd],
  );

  const estimatedTotalVnd = subtotalVnd + shippingVnd + estimatedTaxVnd;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Giỏ hàng trống.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length === 0) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (requireEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng.');
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
    if (!paymentMethodKey) {
      setError('Vui lòng chọn hình thức thanh toán.');
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
            email: trimmedEmail || null,
            address: deliveryMethod === 'SHIPMENT' ? trimmedAddress : null,
          },
          deliveryMethod,
          paymentMethodKey,
          couponCode: couponCode.trim() || null,
          giftCardCode: giftCardCode.trim() || null,
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

      if (data.checkoutUrl) {
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
        {checkoutNote ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            {checkoutNote}
          </p>
        ) : null}

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
          {requireEmail ? (
            <div className="mt-4">
              <Field label="Email" htmlFor="checkout-email">
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@email.com"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Chúng tôi sẽ gửi xác nhận đơn hàng tới email này.
                </p>
              </Field>
            </div>
          ) : null}
        </Section>

        {/* Delivery method */}
        <Section title="Hình thức giao hàng" subtitle="Chọn nơi bạn muốn nhận hàng.">
          <div className="grid gap-3 sm:grid-cols-2">
            {shipping.shipmentEnabled ? (
              <OptionCard
                name="delivery"
                value="SHIPMENT"
                checked={deliveryMethod === 'SHIPMENT'}
                onChange={() => setDeliveryMethod('SHIPMENT')}
                title="Giao tận nhà"
                description={
                  shipping.freeShippingThresholdVnd > 0
                    ? `Phí cố định ${shipping.flatRateVnd.toLocaleString('vi-VN')}₫ — miễn phí từ ${shipping.freeShippingThresholdVnd.toLocaleString('vi-VN')}₫`
                    : `Phí vận chuyển ${shipping.flatRateVnd.toLocaleString('vi-VN')}₫`
                }
                icon={<TruckIcon />}
              />
            ) : null}
            {shipping.pickupEnabled ? (
              <OptionCard
                name="delivery"
                value="PICKUP"
                checked={deliveryMethod === 'PICKUP'}
                onChange={() => setDeliveryMethod('PICKUP')}
                title="Nhận tại cửa hàng"
                description="Đến lấy tại cửa hàng."
                icon={<StoreIcon />}
              />
            ) : null}
          </div>

          <div className="mt-4">
            {isPickup ? (
              <div
                role="status"
                className="rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100"
              >
                <p className="font-semibold">Địa điểm nhận hàng</p>
                <p className="mt-1">{shipping.pickupAddress}</p>
                {shipping.pickupInstructions ? (
                  <p className="mt-2 text-xs text-spool-700 dark:text-spool-200">
                    {shipping.pickupInstructions}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-spool-700 dark:text-spool-200">
                    Chúng tôi sẽ nhắn tin qua số điện thoại trên khi đơn sẵn sàng để bạn đến lấy.
                  </p>
                )}
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

        <Section title="Mã giảm giá" subtitle="Nhập mã nếu bạn có (áp dụng khi đặt hàng).">
          <Field label="Mã coupon" htmlFor="checkout-coupon">
            <input
              id="checkout-coupon"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="VD: WELCOME10"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm uppercase shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </Field>
        </Section>

        <Section title="Thẻ quà tặng" subtitle="Nhập mã thẻ quà tặng nếu bạn có (áp dụng khi đặt hàng).">
          <Field label="Mã thẻ quà tặng" htmlFor="checkout-gift-card">
            <input
              id="checkout-gift-card"
              type="text"
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
              placeholder="VD: GC-ABCD-EFGH"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm uppercase shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </Field>
        </Section>

        {/* Payment method */}
        <Section title="Hình thức thanh toán" subtitle="Chọn cách bạn muốn thanh toán.">
          {paymentMethods.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Hiện chưa có hình thức thanh toán nào khả dụng. Vui lòng liên hệ cửa hàng.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => (
                <OptionCard
                  key={method.key}
                  name="payment"
                  value={method.key}
                  checked={paymentMethodKey === method.key}
                  onChange={() => setPaymentMethodKey(method.key)}
                  title={method.label}
                  description={method.description ?? defaultMethodDescription(method.kind)}
                  icon={
                    method.iconUrl ? (
                      <Image
                        src={method.iconUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      defaultMethodIcon(method.kind)
                    )
                  }
                />
              ))}
            </div>
          )}
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
              {isPickup ? (
                'Miễn phí (nhận tại cửa hàng)'
              ) : shippingVnd === 0 ? (
                'Miễn phí'
              ) : (
                <Price amount={String(shippingVnd)} currencyCode="VND" />
              )}
            </dd>
          </div>
          {tax.taxEnabled ? (
            <div className="flex justify-between">
              <dt className="text-neutral-500 dark:text-neutral-400">
                Thuế ({tax.taxRatePercent}%)
              </dt>
              <dd>
                <Price amount={String(estimatedTaxVnd)} currencyCode="VND" />
              </dd>
            </div>
          ) : null}
          {couponCode.trim().length > 0 ? (
            <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400">
              <dt>Mã giảm giá</dt>
              <dd className="font-mono uppercase">{couponCode.trim()}</dd>
            </div>
          ) : null}
          {giftCardCode.trim().length > 0 ? (
            <div className="flex justify-between text-sm text-violet-700 dark:text-violet-400">
              <dt>Thẻ quà tặng</dt>
              <dd className="font-mono uppercase">{giftCardCode.trim()}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
            <dt>Tổng cộng (ước tính)</dt>
            <dd>
              <Price amount={String(estimatedTotalVnd)} currencyCode="VND" />
            </dd>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Giảm giá coupon và thẻ quà tặng được xác nhận khi đặt hàng. Tổng cuối có thể thay đổi.
          </p>
        </dl>

        <button
          type="submit"
          disabled={submitting || cart.lines.length === 0 || paymentMethods.length === 0}
          className="mt-6 w-full rounded-full bg-filament-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {submitting
            ? 'Đang đặt hàng…'
            : selectedKind === 'gateway'
              ? 'Tiếp tục thanh toán'
              : 'Đặt hàng'}
        </button>

        <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
          {selectedKind === 'gateway'
            ? 'Bạn sẽ được chuyển đến cổng thanh toán để hoàn tất.'
            : selectedKind === 'manual_transfer'
              ? 'Chúng tôi sẽ hiển thị thông tin chuyển khoản sau khi đặt hàng.'
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

function BankIcon(): ReactElement {
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
        d="M3 21h18M4.5 21V10.5M19.5 21V10.5M6.75 21v-7.5M11.25 21v-7.5M12.75 21v-7.5M17.25 21v-7.5M3 10.5 12 4l9 6.5z"
      />
    </svg>
  );
}

function defaultMethodIcon(kind: PaymentMethodKind): ReactElement {
  switch (kind) {
    case 'gateway':
      return <QrIcon />;
    case 'manual_transfer':
      return <BankIcon />;
    default:
      return <CashIcon />;
  }
}

function defaultMethodDescription(kind: PaymentMethodKind): string {
  switch (kind) {
    case 'gateway':
      return 'Thanh toán online qua cổng thanh toán.';
    case 'manual_transfer':
      return 'Chuyển khoản ngân hàng theo thông tin hiển thị sau khi đặt hàng.';
    default:
      return 'Trả tiền mặt khi nhận hàng.';
  }
}
