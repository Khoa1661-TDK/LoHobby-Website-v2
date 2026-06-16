import { describe, expect, it, vi } from 'vitest';
import { buildPatchBody } from '@/components/page-builder/use-autosave';
import type { PageBlock } from '@/lib/page-builder';

describe('buildPatchBody', () => {
  it('should serialize layout with a draft status', () => {
    const layout: PageBlock[] = [{ blockType: 'divider' } as unknown as PageBlock];
    const body = buildPatchBody(layout, 'draft');
    expect(body).toEqual({ layout, status: 'draft' });
  });
  it('should serialize a published status when publishing', () => {
    const body = buildPatchBody([], 'published');
    expect(body.status).toBe('published');
  });
});