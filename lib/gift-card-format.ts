// lib/gift-card-format.ts — pure gift card formatting helpers (no DB)

export function formatGiftCardBalance(balance: number): string {
  return `${balance.toLocaleString('vi-VN')}₫`;
}

export function generateGiftCardCode(): string {
  const segment = (): string =>
    Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `GC-${segment()}-${segment()}`;
}
