// lib/console/format.ts
//
// Formatting shared by every admin console adapter. The console renders
// pre-formatted strings, so all currency, date and percentage shaping happens
// here — never in a component.
//
// No regular expressions: Tailwind scans lib/ and a character class here has
// previously broken the whole stylesheet. Everything below is Intl plus string
// concatenation.

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const EM_DASH = '—';

const countFormatter = new Intl.NumberFormat('vi-VN');

// en-GB gives zero-padded 2-digit day/month/hour/minute parts and a 24-hour
// clock; the parts are reassembled by hand, so the locale's own separators
// never reach the output.
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type DateParts = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

function toDateParts(value: string | Date | null | undefined): DateParts | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const out: Record<string, string> = {};
  for (const part of dateFormatter.formatToParts(date)) {
    out[part.type] = part.value;
  }
  if (!out.day || !out.month || !out.year || !out.hour || !out.minute) return null;

  return {
    day: out.day,
    month: out.month,
    year: out.year,
    hour: out.hour,
    minute: out.minute,
  };
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Whole dong with the currency symbol the console design uses: '450.000 ₫'. */
export function formatVndSymbol(amount: number | null | undefined): string {
  return `${countFormatter.format(Math.round(safeNumber(amount)))} ₫`;
}

/** Payload stores the order code as a bare numeric string; the console shows '#DH-2031'. */
export function formatOrderCode(orderId: string | number | null | undefined): string {
  if (orderId === null || orderId === undefined) return EM_DASH;
  const text = String(orderId).trim();
  if (text.length === 0) return EM_DASH;
  return `#DH-${text}`;
}

/** List-column date: '20/08', in store-local time. */
export function formatDayMonth(iso: string | Date | null | undefined): string {
  const parts = toDateParts(iso);
  if (!parts) return EM_DASH;
  return `${parts.day}/${parts.month}`;
}

/** Order-detail header date: '20/08/2026, 09:14', in store-local time. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  const parts = toDateParts(iso);
  if (!parts) return EM_DASH;
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

/** Percentages use the Vietnamese decimal comma: '7,6%'. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  const formatter = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatter.format(safeNumber(value))}%`;
}

/** Grouped integers: '4.120'. */
export function formatCount(value: number | null | undefined): string {
  return countFormatter.format(Math.round(safeNumber(value)));
}
