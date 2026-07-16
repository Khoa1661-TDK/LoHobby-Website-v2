// app/media/__tests__/route.test.ts
// Media files uploaded through the postgres storage adapter live in the
// MediaFile table, not on disk. The public /media route must fall back to the
// store when public/media has no file — a fresh deploy has an empty volume.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../[...path]/route';

vi.mock('node:fs', () => ({
  createReadStream: vi.fn(),
  existsSync: vi.fn(() => false),
}));

const getMediaFile = vi.hoisted(() => vi.fn());
vi.mock('@/lib/media-file-store', () => ({ getMediaFile }));

function makeContext(segments: string[]) {
  return { params: Promise.resolve({ path: segments }) };
}

const request = new Request('http://localhost/media/test.jpg') as never;

describe('GET /media/[...path]', () => {
  beforeEach(() => {
    getMediaFile.mockReset();
  });

  it('should serve bytes from the postgres store when the file is not on disk', async () => {
    const data = Buffer.from('jpeg-bytes');
    getMediaFile.mockResolvedValue({
      filename: 'sp-123-0.jpg',
      mimeType: 'image/jpeg',
      size: data.length,
      data,
    });

    const response = await GET(request, makeContext(['sp-123-0.jpg']));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(data);
    expect(getMediaFile).toHaveBeenCalledWith('sp-123-0.jpg');
  });

  it('should return 404 when the file is neither on disk nor in the store', async () => {
    getMediaFile.mockResolvedValue(null);

    const response = await GET(request, makeContext(['missing.jpg']));

    expect(response.status).toBe(404);
  });
});
