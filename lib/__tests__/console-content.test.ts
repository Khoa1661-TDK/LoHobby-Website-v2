// lib/__tests__/console-content.test.ts
import { describe, it, expect } from 'vitest';
import type { Page, Redirect } from '@/src/payload/payload-types';
import { toPageRow, toRedirectRow } from '@/lib/console/content';

function makePage(overrides: Partial<Page> = {}): Page {
  return { id: 2, title: 'Giới thiệu', slug: 'gioi-thieu', updatedAt: '', createdAt: '', ...overrides } as Page;
}

describe('toPageRow', () => {
  it('should map a published page to its console row', () => {
    const row = toPageRow(makePage({ status: 'published' }));
    expect(row).toEqual({ id: '2', title: 'Giới thiệu', path: '/gioi-thieu', status: 'published' });
  });

  it('should render the root path when the slug is home', () => {
    expect(toPageRow(makePage({ slug: 'home' })).path).toBe('/');
  });

  it('should render the root path when the slug is missing', () => {
    expect(toPageRow(makePage({ slug: null })).path).toBe('/');
  });

  it('should not double the leading slash when the slug already has one', () => {
    expect(toPageRow(makePage({ slug: '/doi-tra' })).path).toBe('/doi-tra');
  });

  it('should default an unpublished page to draft', () => {
    expect(toPageRow(makePage()).status).toBe('draft');
  });

  it('should render a placeholder title when the page has none', () => {
    expect(toPageRow(makePage({ title: '' })).title).toBe('Chưa đặt tiêu đề');
  });
});

describe('toRedirectRow', () => {
  it('should map a redirect to its console row', () => {
    const doc = {
      id: 9,
      from: '/khuyen-mai-cu',
      to: '/khuyen-mai',
      type: '301',
      enabled: true,
      updatedAt: '',
      createdAt: '',
    } as Redirect;
    expect(toRedirectRow(doc)).toEqual({ id: '9', from: '/khuyen-mai-cu', to: '/khuyen-mai' });
  });
});
