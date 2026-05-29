// scripts/seed-payment-methods.ts — seed the default checkout payment methods.
//
// Idempotent: existing methods (matched by `key`) are left untouched so admin
// edits are never overwritten. No secrets are seeded — gateway credentials stay
// in the CMS or environment variables.
import { config as loadEnv } from 'dotenv';
import type { PaymentProviderId } from '@/lib/payment-provider-catalog';

loadEnv();

type SeedMethod = {
  key: string;
  label: string;
  description: string;
  kind: 'cod' | 'manual_transfer' | 'gateway';
  enabled: boolean;
  sortOrder: number;
  provider?: PaymentProviderId;
};

const DEFAULT_METHODS: SeedMethod[] = [
  {
    key: 'cod',
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Trả tiền mặt khi nhận hàng.',
    kind: 'cod',
    enabled: true,
    sortOrder: 0,
  },
  {
    key: 'payos',
    label: 'Thanh toán online qua VietQR / payOS',
    description: 'Chuyển khoản ngân hàng nhanh bằng mã QR.',
    kind: 'gateway',
    enabled: true,
    sortOrder: 10,
    provider: 'payos',
  },
  {
    key: 'momo',
    label: 'Ví MoMo',
    description: 'Thanh toán nhanh qua ứng dụng MoMo.',
    kind: 'gateway',
    enabled: false,
    sortOrder: 11,
    provider: 'momo',
  },
  {
    key: 'zalopay',
    label: 'ZaloPay',
    description: 'Thanh toán qua ví ZaloPay.',
    kind: 'gateway',
    enabled: false,
    sortOrder: 12,
    provider: 'zalopay',
  },
  {
    key: 'vnpay',
    label: 'VNPay',
    description: 'Thanh toán qua cổng VNPay (thẻ nội địa/quốc tế).',
    kind: 'gateway',
    enabled: false,
    sortOrder: 13,
    provider: 'vnpay',
  },
  {
    key: 'shopeepay',
    label: 'ShopeePay',
    description: 'Thanh toán qua ví ShopeePay.',
    kind: 'gateway',
    enabled: false,
    sortOrder: 14,
    provider: 'shopeepay',
  },
  {
    key: 'stripe',
    label: 'Thẻ quốc tế (Stripe)',
    description: 'Visa, Mastercard và thẻ quốc tế khác qua Stripe.',
    kind: 'gateway',
    enabled: false,
    sortOrder: 15,
    provider: 'stripe',
  },
  {
    key: 'bank-transfer',
    label: 'Chuyển khoản ngân hàng',
    description: 'Chuyển khoản thủ công theo thông tin hiển thị sau khi đặt hàng.',
    kind: 'manual_transfer',
    enabled: false,
    sortOrder: 20,
  },
];

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  for (const method of DEFAULT_METHODS) {
    const existing = await payload.find({
      collection: 'payment-methods',
      where: { key: { equals: method.key } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      console.log(`[payment-methods] "${method.key}" already exists — skipping.`);
      continue;
    }

    await payload.create({
      collection: 'payment-methods',
      overrideAccess: true,
      data: {
        key: method.key,
        label: method.label,
        description: method.description,
        kind: method.kind,
        enabled: method.enabled,
        sortOrder: method.sortOrder,
        ...(method.provider ? { provider: method.provider } : {}),
        ...(method.kind === 'gateway'
          ? { gatewayCredentials: { sandboxMode: true } }
          : {}),
      },
    });
    console.log(`[payment-methods] created "${method.key}".`);
  }

  console.log('[payment-methods] default methods are ready.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payment-methods] seed failed: ${message}`);
  process.exit(1);
});
