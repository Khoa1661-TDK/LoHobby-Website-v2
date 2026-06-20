// components/page-builder/__tests__/use-autosave.test.ts
import { describe, expect, it } from 'vitest';
import { buildPatchBody, pagePatchPath } from '@/components/page-builder/use-autosave';

describe('buildPatchBody', () => {
  it('should include a non-empty title in the patch body', () => {
    expect(buildPatchBody([], 'draft', 'About Us')).toEqual({
      layout: [],
      status: 'draft',
      title: 'About Us',
    });
  });

  it('should omit the title when it is empty or whitespace', () => {
    expect(buildPatchBody([], 'draft', '   ')).toEqual({ layout: [], status: 'draft' });
  });

  it('should omit the title when not provided', () => {
    expect(buildPatchBody([], 'published')).toEqual({ layout: [], status: 'published' });
  });
});

describe('pagePatchPath', () => {
  it('should target Payload REST mounted at /admin/api', () => {
    expect(pagePatchPath(7)).toBe('/admin/api/pages/7');
  });
});
