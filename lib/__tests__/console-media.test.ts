// lib/__tests__/console-media.test.ts
import { describe, it, expect } from 'vitest';
import type { Media } from '@/src/payload/payload-types';
import { toMediaItem } from '@/lib/console/media';

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 5,
    alt: 'Móc khóa Totem',
    url: '/media/totem.png',
    mimeType: 'image/png',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Media;
}

describe('toMediaItem', () => {
  it('should map an image upload to an image item', () => {
    expect(toMediaItem(makeMedia())).toEqual({
      id: '5',
      kind: 'image',
      url: '/media/totem.png',
      alt: 'Móc khóa Totem',
    });
  });

  it('should classify a video mime type as a video item', () => {
    expect(toMediaItem(makeMedia({ mimeType: 'video/mp4' })).kind).toBe('video');
  });

  it('should prefer the generated thumbnail over the full-size url', () => {
    const item = toMediaItem(makeMedia({ thumbnailURL: '/media/totem-300.png' }));
    expect(item.url).toBe('/media/totem-300.png');
  });

  it('should return a null url when the upload has neither url nor thumbnail', () => {
    expect(toMediaItem(makeMedia({ url: null, thumbnailURL: null })).url).toBeNull();
  });

  it('should fall back to the filename for alt text when alt is empty', () => {
    const item = toMediaItem(makeMedia({ alt: '', filename: 'totem.png' }));
    expect(item.alt).toBe('totem.png');
  });

  it('should classify a missing mime type as an image', () => {
    expect(toMediaItem(makeMedia({ mimeType: null })).kind).toBe('image');
  });
});
