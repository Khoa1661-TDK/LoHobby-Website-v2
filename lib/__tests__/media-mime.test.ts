import { describe, expect, it } from 'vitest';
import { mimeTypeForFilename } from '@/lib/media-mime';

describe('mimeTypeForFilename', () => {
  it('should map known image extensions case-insensitively', () => {
    expect(mimeTypeForFilename('photo.JPG')).toBe('image/jpeg');
    expect(mimeTypeForFilename('anim.webp')).toBe('image/webp');
  });

  it('should return octet-stream when extension is unknown or missing', () => {
    expect(mimeTypeForFilename('archive.xyz')).toBe('application/octet-stream');
    expect(mimeTypeForFilename('noextension')).toBe('application/octet-stream');
  });
});
