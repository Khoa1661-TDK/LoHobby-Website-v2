import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
const deleteMany = vi.fn();
const findUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { mediaFile: { upsert, deleteMany, findUnique } },
}));

import {
  MAX_MEDIA_FILE_BYTES,
  deleteMediaFile,
  getMediaFile,
  upsertMediaFile,
} from '@/lib/media-file-store';

describe('upsertMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should upsert filename, mime type, size and bytes', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await upsertMediaFile({ filename: 'a.jpg', mimeType: 'image/jpeg', data });
    expect(upsert).toHaveBeenCalledWith({
      where: { filename: 'a.jpg' },
      create: { filename: 'a.jpg', mimeType: 'image/jpeg', size: 3, data },
      update: { mimeType: 'image/jpeg', size: 3, data },
    });
  });

  it('should throw without writing when file exceeds the size cap', async () => {
    const data = new Uint8Array(MAX_MEDIA_FILE_BYTES + 1);
    await expect(
      upsertMediaFile({ filename: 'big.mp4', mimeType: 'video/mp4', data }),
    ).rejects.toThrow(/caps files/);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('deleteMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete by filename via deleteMany so missing rows do not throw', async () => {
    await deleteMediaFile('a.jpg');
    expect(deleteMany).toHaveBeenCalledWith({ where: { filename: 'a.jpg' } });
  });
});

describe('getMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return null when no row exists', async () => {
    findUnique.mockResolvedValue(null);
    await expect(getMediaFile('missing.jpg')).resolves.toBeNull();
  });

  it('should map the row to a StoredMediaFile', async () => {
    const data = new Uint8Array([9]);
    findUnique.mockResolvedValue({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1,
      data,
      updatedAt: new Date(),
    });
    await expect(getMediaFile('a.jpg')).resolves.toEqual({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1,
      data,
    });
  });
});
