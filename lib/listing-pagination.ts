// lib/listing-pagination.ts — shared pagination helpers for product listings
import { PAGE_SIZE } from '@/lib/constants';

function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === '') return 1;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function paginateList<T>(
  items: T[],
  pageParam: string | string[] | undefined,
  pageSize: number = PAGE_SIZE,
): { page: T[]; currentPage: number; totalPages: number } {
  const size = pageSize > 0 ? pageSize : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  let currentPage = Math.min(totalPages, parsePageParam(pageParam));
  let page = items.slice((currentPage - 1) * size, currentPage * size);

  // Stale ?page= from a previous visit (e.g. after filters shrink the result set).
  if (items.length > 0 && page.length === 0) {
    currentPage = 1;
    page = items.slice(0, size);
  }

  return { page, currentPage, totalPages };
}
