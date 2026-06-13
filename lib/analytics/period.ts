// lib/analytics/period.ts — resolve the dashboard time window from URL params.
// Pure & dependency-free so it is unit-testable and reusable on client + server.

export type PeriodKey = 'month' | '7d' | '30d' | '90d' | 'custom';

export type ResolvedPeriod = {
  key: PeriodKey;
  start: Date;
  end: Date;
  /** Vietnamese label for the dashboard header. */
  label: string;
};

type Params = Record<string, string | string[] | undefined>;

const MAX_CUSTOM_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function currentMonth(now: Date): ResolvedPeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { key: 'month', start, end, label: 'Tháng này' };
}

function rolling(now: Date, days: number, key: PeriodKey, label: string): ResolvedPeriod {
  const end = endOfUtcDay(now);
  const start = startOfUtcDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  return { key, start, end, label };
}

export function resolvePeriod(params: Params, now = new Date()): ResolvedPeriod {
  const period = first(params.period);

  if (period === '7d') return rolling(now, 7, '7d', '7 ngày qua');
  if (period === '30d') return rolling(now, 30, '30d', '30 ngày qua');
  if (period === '90d') return rolling(now, 90, '90d', '90 ngày qua');

  const from = first(params.from);
  const to = first(params.to);
  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    const valid =
      !Number.isNaN(fromDate.getTime()) &&
      !Number.isNaN(toDate.getTime()) &&
      toDate.getTime() >= fromDate.getTime() &&
      toDate.getTime() - fromDate.getTime() <= MAX_CUSTOM_DAYS * DAY_MS;
    if (valid) {
      return {
        key: 'custom',
        start: startOfUtcDay(fromDate),
        end: endOfUtcDay(toDate),
        label: `${from} → ${to}`,
      };
    }
  }

  return currentMonth(now);
}

/** The equally-long window immediately preceding `p` — for period-over-period deltas. */
export function previousPeriod(p: ResolvedPeriod): { start: Date; end: Date } {
  const span = p.end.getTime() - p.start.getTime();
  const end = new Date(p.start.getTime() - 1);
  const start = new Date(end.getTime() - span);
  return { start, end };
}