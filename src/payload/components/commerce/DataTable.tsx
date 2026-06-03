// src/payload/components/commerce/DataTable.tsx — shadcn/ui-styled data table
// for bespoke admin list pages (coupons, gift cards, campaigns, reviews).
//
// Renders outside the Payload shell so it uses Tailwind utility classes.
// Mirrors shadcn's table aesthetic: clean borders, compact padding,
// uppercase-semibold header, hoverable rows.
//
// Usage:
//   <DataTable
//     columns={[
//       { key: 'code', label: 'Mã', sortable: true },
//       { key: 'status', label: 'Trạng thái', render: (v) => <Badge>{v}</Badge> },
//     ]}
//     data={coupons}
//     keyField="id"
//     emptyState={<CommerceEmptyState title="Chưa có mã giảm giá" />}
//   />

'use client';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import type {
  CSSProperties,
  ComponentType,
  ReactElement,
  ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ColumnDef<T extends Record<string, unknown>> = {
  /** Unique key — must match a field in the data row. */
  key: string;
  /** Column header label. */
  label: string;
  /** Optional alignment override. Defaults to 'left'. */
  align?: 'left' | 'center' | 'right';
  /** When true, clicking the header sorts by this column (client-side). */
  sortable?: boolean;
  /** Custom renderer. Receives the raw cell value and the full row. */
  render?: (value: unknown, row: T) => ReactNode;
  /** Fixed width, e.g. '120px' or '1fr'. Omit for auto. */
  width?: string;
};

export type DataTableProps<T extends Record<string, unknown>> = {
  columns: ColumnDef<T>[];
  data: T[];
  /** Field name used as the React key. */
  keyField: keyof T & string;
  /** Optional href generator — makes the row clickable. */
  rowLink?: (row: T) => string;
  /** Shown when data is empty and not loading. */
  emptyState?: ReactNode;
  /** Shows skeleton rows when true. */
  loading?: boolean;
  /** Number of skeleton rows. Default 5. */
  skeletonRows?: number;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Extra style on the outer wrapper. */
  style?: CSSProperties;
  /** Callback when a sort changes. */
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
};

// ─── Sort icon ──────────────────────────────────────────────────────────────

const SortIcon = ({ dir }: { dir: 'asc' | 'desc' | null }): ReactElement => {
  const color = dir ? 'text-neutral-900' : 'text-neutral-300';

  return (
    <span
      className={`inline-flex flex-col leading-none ${color} transition-colors`}
      aria-hidden
    >
      <svg width="10" height="5" viewBox="0 0 10 5" fill="currentColor">
        <path d="M5 0L10 5H0z" />
      </svg>
      <svg width="10" height="5" viewBox="0 0 10 5" fill="currentColor">
        <path d="M5 5L0 0h10z" />
      </svg>
    </span>
  );
};

// ─── Skeleton row ───────────────────────────────────────────────────────────

function SkeletonRow<T extends Record<string, unknown>>({
  columns,
}: {
  columns: ColumnDef<T>[];
}): ReactElement {
  return (
    <tr className="animate-pulse">
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-3">
          <div className="h-4 w-3/4 rounded bg-neutral-200" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  rowLink,
  emptyState,
  loading = false,
  skeletonRows = 5,
  className = '',
  style,
  onSortChange,
}: DataTableProps<T>): ReactElement {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleHeaderClick = useCallback(
    (col: ColumnDef<T>) => {
      if (!col.sortable) return;

      setSortKey((prev) => {
        const newKey = col.key;
        if (prev === newKey) {
          setSortDir((d) => {
            const next = d === 'asc' ? 'desc' : 'asc';
            onSortChange?.(newKey, next);
            return next;
          });
          return newKey;
        }
        setSortDir('asc');
        onSortChange?.(newKey, 'asc');
        return newKey;
      });
    },
    [onSortChange],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        cmp = aVal.getTime() - bVal.getTime();
      } else {
        cmp = String(aVal).localeCompare(String(bVal), 'vi');
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const hasData = data.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}
      style={style}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              {columns.map((col) => {
                const currentSort = sortKey === col.key ? sortDir : null;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';

                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${alignClass} ${
                      col.sortable
                        ? 'cursor-pointer select-none hover:text-neutral-700'
                        : ''
                    }`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => handleHeaderClick(col)}
                    aria-sort={
                      currentSort === 'asc'
                        ? 'ascending'
                        : currentSort === 'desc'
                          ? 'descending'
                          : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      {col.sortable ? <SortIcon dir={currentSort} /> : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <tbody className="divide-y divide-neutral-100 bg-white">
            {loading ? (
              // Skeleton state
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={`skel-${i}`} columns={columns} />
              ))
            ) : hasData ? (
              sorted.map((row) => {
                const href = rowLink?.(row);
                const RowTag = href ? 'a' : 'div';
                const rowProps = href
                  ? { href, className: 'contents' }
                  : { className: 'contents' };

                return (
                  <tr
                    key={String(row[keyField])}
                    className={`transition-colors ${
                      href
                        ? 'cursor-pointer hover:bg-neutral-50'
                        : 'hover:bg-neutral-50'
                    }`}
                    {...(href
                      ? { onClick: () => { window.location.href = href; } }
                      : {})}
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-neutral-700 ${alignClass}`}
                        >
                          {col.render ? col.render(value, row) : renderCell(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="px-4 py-3">
                  {emptyState ?? (
                    <div className="py-10 text-center text-neutral-500">
                      No data
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer meta ─────────────────────────────────────────────────── */}
      {!loading && hasData && (
        <div className="flex items-center justify-end border-t border-neutral-100 px-4 py-2 text-xs text-neutral-400">
          {data.length.toLocaleString()} row{data.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ─── Default cell renderer ──────────────────────────────────────────────────

function renderCell(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-neutral-400">&mdash;</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          value
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-neutral-100 text-neutral-600'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  if (typeof value === 'number') {
    return <span className="font-variant-numeric tabular-nums">{value.toLocaleString('vi-VN')}</span>;
  }

  return String(value);
}

export default DataTable;