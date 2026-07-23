import { beforeEach, describe, expect, it, vi } from 'vitest';

// media-file-store talks to Postgres directly via a pg Pool (no Prisma). Mock
// the pool's query so we can assert the SQL/params without a real database.
const query = vi.fn();
vi.mock('pg', () => ({
  Pool: vi.fn(() => ({ query })),
}));

// pool() throws unless DATABASE_URL is set; the value is unused (Pool is mocked).
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import {
  MAX_MEDIA_FILE_BYTES,
  deleteMediaFile,
  getMediaFile,
  hasMediaFile,
  upsertMediaFile,
} from '@/lib/media-file-store';

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('upsertMediaFile', () => {
  it('should INSERT ... ON CONFLICT with filename, mime type, size and bytes', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await upsertMediaFile({ filename: 'a.jpg', mimeType: 'image/jpeg', data });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO "MediaFile"');
    expect(sql).toContain('ON CONFLICT (filename) DO UPDATE');
    expect(params).toEqual(['a.jpg', 'image/jpeg', 3, Buffer.from([1, 2, 3])]);
  });

  it('should throw without querying when file exceeds the size cap', async () => {
    const data = new Uint8Array(MAX_MEDIA_FILE_BYTES + 1);
    await expect(
      upsertMediaFile({ filename: 'big.mp4', mimeType: 'video/mp4', data }),
    ).rejects.toThrow(/caps files/);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('deleteMediaFile', () => {
  it('should DELETE by filename', async () => {
    await deleteMediaFile('a.jpg');
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toContain('DELETE FROM "MediaFile"');
    expect(params).toEqual(['a.jpg']);
  });
});

describe('getMediaFile', () => {
  it('should return null when no row exists', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(getMediaFile('missing.jpg')).resolves.toBeNull();
  });

  it('should map the row to a StoredMediaFile with Uint8Array data', async () => {
    query.mockResolvedValue({
      rows: [{ filename: 'a.jpg', mimeType: 'image/jpeg', size: 1, data: Buffer.from([9]) }],
      rowCount: 1,
    });
    const result = await getMediaFile('a.jpg');
    expect(result).toEqual({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1,
      data: new Uint8Array([9]),
    });
    expect(result?.data).toBeInstanceOf(Uint8Array);
  });
});

describe('hasMediaFile', () => {
  it('should return true when a row is present', async () => {
    query.mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
    await expect(hasMediaFile('a.jpg')).resolves.toBe(true);
  });

  it('should return false when no row is present', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(hasMediaFile('missing.jpg')).resolves.toBe(false);
  });
});
